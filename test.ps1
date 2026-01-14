$body = @{
    targetUserIds = "all"
    subject = "Test Message"
    content = "System message test via PowerShell"
} | ConvertTo-Json
Invoke-RestMethod -Uri "https://ezwh4h4fjf.execute-api.ap-northeast-1.amazonaws.com/Prod/admin/inbox/messages" -Method Post -ContentType "application/json" -Body $body
