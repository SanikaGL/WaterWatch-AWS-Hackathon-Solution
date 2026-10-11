# WaterWatch one-shot deploy (Windows PowerShell).
# Prereqs (one-time): SAM CLI installed, `aws configure` done, Node 22 active.
#   winget install Amazon.SAM-CLI
#   aws configure            (region us-east-1 recommended for Bedrock)
#
# Usage:
#   .\deploy.ps1                 # deploy dev stack
#   .\deploy.ps1 -Config prod    # deploy prod stack
#
# This script is idempotent: safe to re-run after code changes.

param(
  [string]$Config = "default",   # "default" (dev) or "prod"
  [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"
$env:NODE_OPTIONS = "--use-system-ca"   # required on this network (TLS interception)

Write-Host "==> Installing backend deps (for esbuild bundling)..." -ForegroundColor Cyan
Push-Location backend; npm install --no-fund --no-audit; Pop-Location

Write-Host "==> Running unit tests..." -ForegroundColor Cyan
Push-Location backend; npm test; Pop-Location

Write-Host "==> sam build..." -ForegroundColor Cyan
sam build

Write-Host "==> sam deploy ($Config)..." -ForegroundColor Cyan
if ($Config -eq "prod") { sam deploy --config-env prod } else { sam deploy }

$stack = if ($Config -eq "prod") { "waterwatch-prod" } else { "waterwatch-dev" }

Write-Host "==> Reading stack outputs..." -ForegroundColor Cyan
$outs = aws cloudformation describe-stacks --stack-name $stack --region $Region `
  --query "Stacks[0].Outputs" | ConvertFrom-Json
function Out($k) { ($outs | Where-Object { $_.OutputKey -eq $k }).OutputValue }

$apiUrl   = Out "ApiUrl"
$mediaB   = Out "MediaPublicBase"
$poolId   = Out "UserPoolId"
$clientId = Out "UserPoolClientId"
$siteUrl  = Out "SiteUrl"
$siteBkt  = Out "SiteBucketName"
$distId   = Out "DistributionId"

Write-Host "API:    $apiUrl"
Write-Host "Media:  $mediaB"
Write-Host "Pool:   $poolId / $clientId"
Write-Host "Site:   $siteUrl"

Write-Host "==> Writing frontend/.env.production..." -ForegroundColor Cyan
@"
VITE_API_URL=$apiUrl
VITE_MEDIA_BASE=$mediaB
VITE_COGNITO_USER_POOL_ID=$poolId
VITE_COGNITO_CLIENT_ID=$clientId
"@ | Set-Content -NoNewline -Path frontend\.env.production

Write-Host "==> Building frontend..." -ForegroundColor Cyan
Push-Location frontend; npm install --no-fund --no-audit; npm run build; Pop-Location

Write-Host "==> Syncing frontend to S3 ($siteBkt)..." -ForegroundColor Cyan
aws s3 sync frontend\dist "s3://$siteBkt" --delete --region $Region

Write-Host "==> Invalidating CloudFront ($distId)..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $distId --paths "/*" --region $Region | Out-Null

Write-Host ""
Write-Host "DONE. Public demo URL:" -ForegroundColor Green
Write-Host "    $siteUrl" -ForegroundColor Green
Write-Host ""
Write-Host "Next: create 1 authority user (see DEPLOY.md 'Create an authority account')." -ForegroundColor Yellow
