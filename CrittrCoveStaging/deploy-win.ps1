# PowerShell script for Windows deployment
Write-Host "Starting deployment process..."

# Fetch latest remote branches
Write-Host "Fetching latest remote branches..."
git fetch origin
if ($LASTEXITCODE -ne 0) { 
    Write-Error "Failed to fetch from origin"
    exit 1 
}

# Clean up any existing gh-pages directory
if (Test-Path "gh-pages") {
    Write-Host "Removing existing gh-pages directory..."
    Remove-Item -Recurse -Force "gh-pages"
}

# Create worktree from latest remote gh-pages
Write-Host "Creating gh-pages worktree..."
git worktree add gh-pages origin/gh-pages
if ($LASTEXITCODE -ne 0) { 
    Write-Error "Failed to create gh-pages worktree"
    exit 1 
}

# Clear existing files in gh-pages (except .git)
Write-Host "Clearing gh-pages directory..."
Get-ChildItem "gh-pages" -Exclude ".git" | Remove-Item -Recurse -Force

# Copy web-build files to gh-pages
Write-Host "Copying web-build files..."
Copy-Item -Path "web-build\*" -Destination "gh-pages" -Recurse -Force

# Create CNAME file
Write-Host "Creating CNAME file..."
"staging.crittrcove.com" | Out-File -FilePath "gh-pages\CNAME" -Encoding ascii

# Change to gh-pages directory and commit
Set-Location "gh-pages"

Write-Host "Adding files to git..."
git add .
if ($LASTEXITCODE -ne 0) { 
    Write-Error "Failed to add files to git"
    Set-Location ".."
    exit 1 
}

Write-Host "Committing changes..."
git commit -m "Deploy to gh-pages"
if ($LASTEXITCODE -ne 0) { 
    Write-Error "Failed to commit changes"
    Set-Location ".."
    exit 1 
}

Write-Host "Pushing to remote..."
git push origin HEAD:gh-pages
if ($LASTEXITCODE -ne 0) { 
    Write-Error "Failed to push to remote"
    Set-Location ".."
    exit 1 
}

# Go back to main directory and clean up
Set-Location ".."
Write-Host "Cleaning up worktree..."
git worktree remove gh-pages

Write-Host "Deployment completed successfully!" 