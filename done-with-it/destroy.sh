#!/bin/bash
# Removes everything (site, photos, database, functions):  bash destroy.sh
set -e
STACK=${1:-done-with-it}
REGION=${AWS_REGION:-$(aws configure get region)}
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)
aws s3 rm "s3://$BUCKET" --recursive
aws cloudformation delete-stack --stack-name "$STACK" --region "$REGION"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" --region "$REGION"
aws s3 rb "s3://$STACK-artifacts-$ACCOUNT-$REGION" --force
echo "All resources removed."
