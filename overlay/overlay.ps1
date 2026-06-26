# Lull 桌面角落悬浮窗(PowerShell + WPF,零下载,Windows 自带)。
# 设计:Aurora 白卡 + 顶部类别色渐变条 + 圆角图标徽章(类别字母) + 圆角按钮 + 答案淡色框;字体 Nunito(随包带)。
# 坑1:共享变量/控件必须 $script: 作用域。坑2:PS 变量名不分大小写,SeenLabel(控件)与 seenCount(计数)不能撞名。
# 坑3:本文件改完必须存 UTF-8 BOM,否则中文乱。坑4:读 queue.json 用 $x=...|ConvertFrom-Json 再 @($x),别 @(管道)。
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Xaml | Out-Null

# 内置兜底卡:仅在 ~/.lull/queue.json 还没生成时短暂显示(如首次启动)。默认英文,各卡自带 color。
$script:cards = @(
  @{c='Writing';      color='#7F77DD'; icon='eb04'; q='How should a work email open?';        a='Lead with your conclusion or ask, then the details. Readers are busy.'},
  @{c='Productivity'; color='#EF9F27'; icon='ea38'; q='What is the two-minute rule?';         a='If it takes under two minutes, do it now instead of tracking it.'},
  @{c='Science';      color='#378ADD'; icon='ebd2'; q='Why is the sky blue?';                 a='Air scatters shorter blue wavelengths more (Rayleigh scattering).'},
  @{c='Health';       color='#1D9E75'; icon='eabe'; q='What is the 20-20-20 eye rule?';       a='Every 20 min, look ~20 ft (6 m) away for 20 seconds to ease eye strain.'},
  @{c='Money';        color='#639922'; icon='eb82'; q='How big should an emergency fund be?'; a='Usually 3-6 months of expenses, kept instantly accessible.'},
  @{c='Psychology';   color='#D4537E'; icon='f59f'; q='What is the sunk-cost trap?';          a='Past, unrecoverable cost should not drive decisions; weigh only future value.'}
)
$script:cards = $script:cards | Sort-Object { Get-Random }

# 界面语言(默认 en;读 ~/.lull/config.json 的 lang)。坑:必须 -Encoding UTF8。
$script:lang = 'en'
try {
  $cfgFile = Join-Path $env:USERPROFILE '.lull\config.json'
  if (Test-Path $cfgFile) {
    $cfg = Get-Content $cfgFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($cfg.lang -eq 'zh' -or $cfg.lang -eq 'en') { $script:lang = $cfg.lang }
  }
} catch {}
if ($script:lang -eq 'zh') { $script:L = @{ seen = '今日已看'; flip = '看答案'; next = '下一张' } }
else { $script:L = @{ seen = 'Seen today:'; flip = 'Show answer'; next = 'Next' } }

$script:queuePath = Join-Path $env:USERPROFILE '.lull\queue.json'
$script:aiCardPath = Join-Path $env:USERPROFILE '.lull\ai-card.json'
function Load-Queue {
  try {
    if (Test-Path $script:queuePath) {
      $data = Get-Content $script:queuePath -Raw -Encoding UTF8 | ConvertFrom-Json
      $arr = @($data)
      if ($arr.Count -gt 0) { $script:cards = $arr; return $true }
    }
  } catch {}
  return $false
}
Load-Queue | Out-Null

[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        WindowStyle="None" AllowsTransparency="True" Background="Transparent"
        Topmost="True" ResizeMode="NoResize" ShowInTaskbar="False"
        Width="356" SizeToContent="Height">
  <Window.Resources>
    <Style x:Key="Pill" TargetType="Button">
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="bd" CornerRadius="13" Background="{TemplateBinding Background}" BorderBrush="{TemplateBinding BorderBrush}" BorderThickness="{TemplateBinding BorderThickness}">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="bd" Property="Opacity" Value="0.88"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <Style x:Key="Bare" TargetType="Button">
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border Background="Transparent"><ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/></Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True"><Setter Property="Opacity" Value="0.6"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
  </Window.Resources>
  <Border x:Name="Card" Background="#FFFFFF" CornerRadius="18" Margin="14,10,14,16">
    <Border.Effect><DropShadowEffect BlurRadius="26" ShadowDepth="5" Direction="270" Color="#1A1A2E" Opacity="0.22"/></Border.Effect>
    <StackPanel>
      <Border x:Name="TopBar" Height="6" CornerRadius="18,18,0,0"/>
      <StackPanel Margin="15,11,15,15">
        <Grid>
          <TextBlock Text="Lull" Foreground="#6B6960" FontSize="12.5" FontWeight="Bold" HorizontalAlignment="Left" VerticalAlignment="Center"/>
          <StackPanel Orientation="Horizontal" HorizontalAlignment="Right" VerticalAlignment="Center">
            <TextBlock x:Name="SeenLabel" Text="Seen today: 0" Foreground="#A8A59B" FontSize="12.5" FontWeight="SemiBold" VerticalAlignment="Center" Margin="0,0,9,0"/>
            <Button x:Name="LangBtn" Content="中" Width="26" Height="20" FontSize="11.5" FontWeight="SemiBold" Foreground="#6B6960" BorderBrush="#E6E4DD" BorderThickness="0" Style="{StaticResource Bare}" Cursor="Hand" ToolTip="切换中文 / English"/>
            <Button x:Name="CloseBtn" Content="X" Width="20" Height="20" FontSize="12.5" Foreground="#9A978D" Style="{StaticResource Bare}" Cursor="Hand"/>
          </StackPanel>
        </Grid>
        <StackPanel Orientation="Horizontal" Margin="0,13,0,11">
          <Border x:Name="Badge" Width="36" Height="36" CornerRadius="11">
            <TextBlock x:Name="BadgeText" Text="?" FontSize="17" FontWeight="Bold" HorizontalAlignment="Center" VerticalAlignment="Center"/>
          </Border>
          <TextBlock x:Name="Cat" Text="-" FontSize="13" FontWeight="Bold" Margin="10,0,0,0" VerticalAlignment="Center"/>
        </StackPanel>
        <TextBlock x:Name="Q" Margin="1,0,1,0" TextWrapping="Wrap" FontSize="16.5" FontWeight="Medium" Foreground="#1F1E1B" MinHeight="44"/>
        <Border x:Name="AnswerBox" CornerRadius="12" Padding="11,9,11,10" Margin="0,11,0,0" Visibility="Collapsed">
          <TextBlock x:Name="A" TextWrapping="Wrap" FontSize="14" FontWeight="Medium" LineHeight="20"/>
        </Border>
        <UniformGrid Columns="2" Margin="0,15,0,0">
          <Button x:Name="FlipBtn" Content="Show answer" Height="34" Margin="0,0,4,0" FontSize="13.5" FontWeight="Bold" Foreground="#FFFFFF" Style="{StaticResource Pill}" Cursor="Hand"/>
          <Button x:Name="NextBtn" Content="Next" Height="34" Margin="4,0,0,0" FontSize="13.5" FontWeight="Bold" Foreground="#5C5A52" Background="#FAF9F6" BorderBrush="#E6E4DD" BorderThickness="1.5" Style="{StaticResource Pill}" Cursor="Hand"/>
        </UniformGrid>
      </StackPanel>
    </StackPanel>
  </Border>
</Window>
'@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$script:win = [Windows.Markup.XamlReader]::Load($reader)
$script:Cat = $script:win.FindName('Cat'); $script:Q = $script:win.FindName('Q'); $script:A = $script:win.FindName('A')
$script:AnswerBox = $script:win.FindName('AnswerBox'); $script:TopBar = $script:win.FindName('TopBar')
$script:Badge = $script:win.FindName('Badge'); $script:BadgeText = $script:win.FindName('BadgeText'); $script:SeenLabel = $script:win.FindName('SeenLabel')
$script:FlipBtn = $script:win.FindName('FlipBtn'); $script:NextBtn = $script:win.FindName('NextBtn')
$script:CloseBtn = $script:win.FindName('CloseBtn'); $script:LangBtn = $script:win.FindName('LangBtn')

# 字体:英文用圆润 Nunito(随包);中文用系统 Microsoft YaHei UI(一致,避免逐字回退致粗细不一)。
# 图标字体 Tabler(随包),徽章用。
$script:fontDir = (Join-Path $PSScriptRoot 'fonts') -replace '\\', '/'
$script:iconFont = $null
try { $script:iconFont = New-Object Windows.Media.FontFamily("file:///$($script:fontDir)/#tabler-icons") } catch {}
function Set-UiFont {
  try {
    if ($script:lang -eq 'zh') { $script:win.FontFamily = New-Object Windows.Media.FontFamily('Microsoft YaHei UI') }
    else { $script:win.FontFamily = New-Object Windows.Media.FontFamily("file:///$($script:fontDir)/#Nunito") }
  } catch {}
}
Set-UiFont

$script:idx = 0; $script:seenCount = 0; $script:revealed = $false
$script:lock = Join-Path $env:USERPROFILE '.lull\overlay.lock'
$script:refreshScript = Join-Path $PSScriptRoot '..\plugins\lull\scripts\refresh-queue.js'
$script:White = [Windows.Media.Color]::FromRgb(255, 255, 255)
$script:Black = [Windows.Media.Color]::FromRgb(0, 0, 0)
$script:curLight = $script:White; $script:curDark = $script:Black
# 按语言设界面文字(覆盖 XAML 默认)
$script:FlipBtn.Content = $script:L.flip
$script:NextBtn.Content = $script:L.next
$script:LangBtn.Content = if ($script:lang -eq 'zh') { 'EN' } else { '中' }
$script:SeenLabel.Text = "$($script:L.seen) 0"

function ToColor($hex) { return [Windows.Media.ColorConverter]::ConvertFromString($hex) }
function MixColor($c, $t, $amt) {
  $r = [byte][math]::Round($c.R + ($t.R - $c.R) * $amt)
  $g = [byte][math]::Round($c.G + ($t.G - $c.G) * $amt)
  $b = [byte][math]::Round($c.B + ($t.B - $c.B) * $amt)
  return [Windows.Media.Color]::FromRgb($r, $g, $b)
}
function Brush($color) { return New-Object Windows.Media.SolidColorBrush($color) }

function Show-Card {
  $c = $script:cards[$script:idx]
  $hex = $c.color; if (-not $hex) { $hex = '#888888' }
  $base = ToColor($hex)
  $light = MixColor $base $script:White 0.86
  $dark = MixColor $base $script:Black 0.32
  $gradEnd = MixColor $base $script:White 0.42
  $script:curLight = $light; $script:curDark = $dark
  # 顶部渐变条
  $gb = New-Object Windows.Media.LinearGradientBrush
  $gb.StartPoint = '0,0'; $gb.EndPoint = '1,0'
  $gb.GradientStops.Add((New-Object Windows.Media.GradientStop($base, 0)))
  $gb.GradientStops.Add((New-Object Windows.Media.GradientStop($gradEnd, 1)))
  $script:TopBar.Background = $gb
  # 圆角徽章:学科图标(Tabler 字体)。无 icon 或图标字体没加载则退回类别首字母。
  $script:Badge.Background = Brush $light
  $script:BadgeText.Foreground = Brush $dark
  if ($c.icon -and $script:iconFont) {
    try {
      $script:BadgeText.FontFamily = $script:iconFont
      $script:BadgeText.FontSize = 19
      $script:BadgeText.Text = [string][char][Convert]::ToInt32([string]$c.icon, 16)
    } catch { $script:BadgeText.Text = '*' }
  } else {
    $script:BadgeText.ClearValue([Windows.Controls.TextBlock]::FontFamilyProperty)
    $script:BadgeText.FontSize = 17
    $m2 = '*'
    if ($c.ai) { $m2 = [char]0x2605 }
    else { $t = ($c.c -replace '[^0-9A-Za-z一-龥]', ''); if ($t.Length -gt 0) { $m2 = $t.Substring(0, 1).ToUpper() } }
    $script:BadgeText.Text = [string]$m2
  }
  $script:Cat.Foreground = Brush $dark
  $script:Cat.Text = $c.c
  $script:FlipBtn.Background = Brush $base
  $script:Q.Text = $c.q
  $script:A.Text = ''
  $script:AnswerBox.Visibility = 'Collapsed'
  $script:revealed = $false
}
function Invoke-Reveal {
  if (-not $script:revealed) {
    $script:A.Text = $script:cards[$script:idx].a
    $script:AnswerBox.Background = Brush $script:curLight
    $script:A.Foreground = Brush $script:curDark
    $script:AnswerBox.Visibility = 'Visible'
    $script:revealed = $true
    $script:seenCount++
    $script:SeenLabel.Text = "$($script:L.seen) $($script:seenCount)"
  }
}
function Invoke-Next { $script:idx = ($script:idx + 1) % $script:cards.Count; Show-Card }
function Insert-AiCard {
  try {
    if (Test-Path $script:aiCardPath) {
      $card = Get-Content $script:aiCardPath -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($card -and $card.q) {
        $script:cards = @($card) + @($script:cards)
        $script:idx = 0; Show-Card; return $true
      }
    }
  } catch {}
  return $false
}
function Invoke-ToggleLang {
  $newLang = if ($script:lang -eq 'zh') { 'en' } else { 'zh' }
  try {
    $cfgFile = Join-Path $env:USERPROFILE '.lull\config.json'
    $cfg = if (Test-Path $cfgFile) { Get-Content $cfgFile -Raw -Encoding UTF8 | ConvertFrom-Json } else { [PSCustomObject]@{} }
    $cfg | Add-Member -NotePropertyName lang -NotePropertyValue $newLang -Force
    [System.IO.File]::WriteAllText($cfgFile, ($cfg | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
  } catch {}
  $script:lang = $newLang
  Set-UiFont
  if ($newLang -eq 'zh') { $script:L = @{ seen = '今日已看'; flip = '看答案'; next = '下一张' }; $script:LangBtn.Content = 'EN' }
  else { $script:L = @{ seen = 'Seen today:'; flip = 'Show answer'; next = 'Next' }; $script:LangBtn.Content = '中' }
  $script:FlipBtn.Content = $script:L.flip
  $script:NextBtn.Content = $script:L.next
  $script:SeenLabel.Text = "$($script:L.seen) $($script:seenCount)"
  try { if (Test-Path $script:refreshScript) { & node $script:refreshScript 2>$null | Out-Null } } catch {}
  if (Load-Queue) { $script:idx = 0; Show-Card }
}

$script:FlipBtn.Add_Click({ Invoke-Reveal })
$script:Q.Add_MouseLeftButtonUp({ Invoke-Reveal })
$script:NextBtn.Add_Click({ Invoke-Next })
$script:CloseBtn.Add_Click({ $script:win.Close() })
$script:LangBtn.Add_Click({ Invoke-ToggleLang })
$script:win.Add_MouseLeftButtonDown({ try { $script:win.DragMove() } catch {} })

$script:win.Add_Loaded({
  $wa = [System.Windows.SystemParameters]::WorkArea
  $script:win.Left = $wa.Right - $script:win.ActualWidth - 24
  $script:win.Top = $wa.Bottom - $script:win.ActualHeight - 24
  try { Set-Content -Path $script:lock -Value "$PID" -Encoding ASCII } catch {}
})
$script:win.Add_Closed({ try { Remove-Item $script:lock -ErrorAction SilentlyContinue } catch {} })

$ev = Join-Path $env:USERPROFILE '.lull\events.jsonl'
$script:offset = 0
if (Test-Path $ev) { try { $script:offset = (Get-Item $ev).Length } catch {} }
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(700)
$timer.Add_Tick({
  try {
    if (-not (Test-Path $ev)) { return }
    $len = (Get-Item $ev).Length
    if ($len -lt $script:offset) { $script:offset = $len; return }
    if ($len -le $script:offset) { return }
    $fs = [System.IO.File]::Open($ev, 'Open', 'Read', 'ReadWrite')
    $fs.Seek($script:offset, 'Begin') | Out-Null
    $sr = New-Object System.IO.StreamReader($fs)
    $new = $sr.ReadToEnd(); $sr.Close(); $fs.Close()
    $script:offset = $len
    if ($new -match 'wait_start') {
      if (Load-Queue) { $script:idx = 0; Show-Card } else { Invoke-Next }
      $script:win.Topmost = $false; $script:win.Topmost = $true
      try { $script:win.Activate() } catch {}
    }
    if ($new -match 'ai_card') {
      if (Insert-AiCard) {
        $script:win.Topmost = $false; $script:win.Topmost = $true
        try { $script:win.Activate() } catch {}
      }
    }
  } catch {}
})
$timer.Start()

Show-Card
$script:win.ShowDialog() | Out-Null
