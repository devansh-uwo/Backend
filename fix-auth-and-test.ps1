Write-Host "=== Google Cloud Re-authentication Helper ==="
Write-Host "This script will open your browser to log in to Google Cloud."
Write-Host "Please allow the access when prompted."
Write-Host ""
cmd /c "gcloud auth application-default login"
if ($?) {
    Write-Host ""
    Write-Host "✅ Authentication successful!"
    Write-Host "Running Vertex AI connection test..."
    Write-Host "----------------------------------------"
    node test-vertex-hire.js
} else {
    Write-Host ""
    Write-Host "❌ Authentication failed. Please try running 'gcloud auth application-default login' manually."
}
