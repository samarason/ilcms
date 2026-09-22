Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
installDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Extract application bundle on first run
If Not fso.FileExists(installDir & "\app\server.js") Then
    WshShell.Run "powershell -NoProfile -Command ""Expand-Archive -Path '" & installDir & "\ilcms-app.zip' -DestinationPath '" & installDir & "\app' -Force""", 0, True
End If

' Start Node server in background if not already active
WshShell.CurrentDirectory = installDir & "\app"
WshShell.Environment("PROCESS")("NODE_ENV") = "production"
WshShell.Environment("PROCESS")("PORT") = "3000"
WshShell.Environment("PROCESS")("AIRGAP_MODE") = "true"

WshShell.Run "cmd /c node server.js", 0, False

WScript.Sleep 1500
WshShell.Run "http://127.0.0.1:3000"
