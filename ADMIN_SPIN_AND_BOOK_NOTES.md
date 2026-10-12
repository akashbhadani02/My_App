# Admin spin prizes and book payment

## Spin prize settings
Sign in to the admin dashboard. Use the floating **🎡 Spin Prize Settings** button.
Enter 2–30 comma-separated prize values in rupees, for example `1, 2, 5, 10, 20`.
Amounts can include up to two decimal places. New settings are stored in MongoDB and used by the server for future spins. Existing wallet balances are not changed.

## Book purchase methods
The student Book Purchase modal already supports:
- **UPI / QR payment**: pay using the displayed QR, enter the UTR/reference, upload the payment screenshot, and submit for admin verification.
- **Wallet payment**: choose Buy with Wallet; the book price is deducted from the wallet and access is enabled if the balance is sufficient.

Book price remains ₹499 in this version; the new admin setting specifically controls the Spin prize values.
