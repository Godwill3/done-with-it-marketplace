#!/bin/bash
# Run in AWS CloudShell from inside this folder:  bash deploy.sh
set -e
STACK=${1:-done-with-it}
REGION=${AWS_REGION:-$(aws configure get region)}
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS="$STACK-artifacts-$ACCOUNT-$REGION"

aws s3 mb "s3://$ARTIFACTS" --region "$REGION" 2>/dev/null || true
aws cloudformation package --template-file template.yaml --s3-bucket "$ARTIFACTS" --output-template-file packaged.yaml
aws cloudformation deploy --template-file packaged.yaml --stack-name "$STACK" --region "$REGION" \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND

out() { aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
API=$(out ApiUrl); BUCKET=$(out WebsiteBucketName); URL=$(out WebsiteUrl)

sed "s|PASTE_API_URL_HERE|$API|" frontend/index.html > /tmp/index.html
aws s3 cp /tmp/index.html "s3://$BUCKET/index.html" --content-type text/html
echo; echo "Live at: $URL"
