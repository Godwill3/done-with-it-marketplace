# Done With It: a second-hand marketplace on AWS

**Live demo:** http://done-with-it-websitebucket-3girxie5ixmo.s3-website-us-east-1.amazonaws.com/

People upload things they no longer use (shoes, a calculator, a phone) with a photo and a low price.
Buyers browse, search, and message the seller on WhatsApp.

## Architecture (3 tiers)
| Tier | Service | Role |
|------|---------|------|
| Presentation | S3 static website | Browse, search, sell form, seller tools |
| Logic | API Gateway (throttled) + 4 Lambda functions | One folder per function |
| Data | DynamoDB + S3 `images/` | Listings and photos |

## API
| Method | Path | Folder | Who |
|--------|------|--------|-----|
| POST | /listings | functions/createListing | Anyone (photo is resized in the browser, validated as JPEG) |
| GET | /listings | functions/listListings | Anyone (available items only) |
| PUT | /listings/{id} | functions/updateListing | Seller (change price, mark sold) |
| DELETE | /listings/{id} | functions/deleteListing | Seller (also deletes the photo) |

Sellers prove ownership with a secret PIN. Only a salted SHA-256 hash is stored.

## Deploy (AWS CloudShell)
```bash
unzip done-with-it.zip && cd done-with-it
bash deploy.sh     # prints the live URL
bash destroy.sh    # removes everything
```
