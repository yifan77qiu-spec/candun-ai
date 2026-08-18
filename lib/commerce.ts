export const riskCheckProduct = {
  id: "candun-risk-check-v1",
  name: "餐盾｜餐厅经营风险体检",
  freeUses: 1,
  experiencePrice: 18.8,
  regularPrice: 99,
  quota: 100,
  sold: 0,
  detectionHref: "/",
  checkoutHref: "/checkout",
  paymentProvider: "manual-merchant-qr",
  membershipProvider: "reserved-membership",
  entitlements: {
    free: "risk-summary",
    paid: "full-compliance-report",
  },
} as const;
