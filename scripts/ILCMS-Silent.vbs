Option Explicit
Dim WshShell, fso, installDir, batPath

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

installDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = installDir & "\ILCMS.bat"

If fso.FileExists(batPath) Then
    ' Run ILCMS.bat in completely hidden background mode (0) without blocking
    WshShell.Run "cmd.exe /c """ & batPath & """ --silent", 0, False
Else
    MsgBox "Could not locate ILCMS launcher script at:" & vbCrLf & batPath, 16, "ILCMS - Launcher Error"
End If
