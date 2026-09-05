# Brands demonstration images

These five brands, products, and partnerships are illustrative local fixtures,
not customer claims. Photos are stock stand-ins from Unsplash, downloaded on
2026-09-06 for this requested local demonstration.

| File             | Source                                                       |
| ---------------- | ------------------------------------------------------------ |
| botanica.jpg     | https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b |
| clay-room.jpg    | https://images.unsplash.com/photo-1578749556568-bc2c40e68b61 |
| linen-house.jpg  | https://images.unsplash.com/photo-1616486338812-3dadae4b4ace |
| mta-outdoor.jpg  | https://images.unsplash.com/photo-1553062407-98eeb64c6a62    |
| studio-forma.jpg | https://images.unsplash.com/photo-1489987707025-afc232f7ea0f |

Run `pnpm seed:brands` after the existing Nino demo account has been seeded.
The script allows only a local development database and uploads these checked-in
photos to owner-scoped S3 paths, avoiding third-party runtime image dependencies.
It adds five published, platform-approved brands and one product per brand.
For Nino: Clay Room is Approved, Mta Outdoor Pending, Linen House Rejected,
and Botanica / Studio Forma Not applied. Existing Aromashop data is preserved.
Rerunning preserves changes to application states. Use
`pnpm seed:brands --reset-applications` to restore only the five demonstration
application states after manually testing Apply; this leaves other creators and
brands untouched. Fixture brand accounts have no sign-in credentials.
