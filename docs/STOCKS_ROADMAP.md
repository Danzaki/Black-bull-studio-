# Stocks roadmap (Base Hub, Coinbase tokenized stocks kadai)

Dokoki: daya bayan daya. Kowane mataki: script mai duba kansa (tsc), preview/main, sai a alama [x].
Kar a tura main idan `npx tsc --noEmit` bai yi shiru ba. Doka: a tuntubi lauya kafin a bude wa jama'a.

## Mataki 1: abin da ake gani a farko
- [x] 1. Hotuna masu cika
- [x] 2. Sparkline a kowane layi
- [x] 3. Rukunai (sheet)
- [x] 4. Tab din "Most traded"

## Mataki 2: sa mutum ya dawo
- [x] 5. Faxakarwar farashi (cron /api/cron/price-alerts, bukatar jadawali: cron-job.org ko Vercel Pro)
- [x] 6. Watchlist a asusu (/api/stock-watchlist)
- [ ] 7. Portfolio na stocks (riba/asara, tebur stock_cost)
- [ ] 8. Sanarwar bude/rufe kasuwa da kalandar hutu

## Mataki 3: bayanai masu zurfi
- [ ] 9. Labarai na kowane kamfani
- [ ] 10. Kalandar earnings da dividend
- [ ] 11. Bayanin kamfani (sector, me suke yi)

## Mataki 4: ciniki
- [ ] 12. 1-tap + Sent -> Confirmed (an fara)
- [ ] 13. Dollar-cost averaging (aiki a baya)

## Abubuwan da ya kamata a tabbatar
- Jadawalin cron na faxakarwa (CRON_SECRET a Vercel)
- grant na evm_swap_fees zuwa service_role
