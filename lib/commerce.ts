export const riskCheckProduct = {
  id: "candun-risk-check-v1",
  name: "餐盾AI｜餐饮风险体检",
  freeUses: 1,
  experiencePrice: 18.8,
  regularPrice: 99,
  quota: 100,
  sold: 0,
  detectionHref: "/",
  checkoutHref: "/pricing#unlock",
  paymentProvider: "reserved-wechat-pay",
  membershipProvider: "reserved-membership",
  entitlements: {
    free: "risk-summary",
    paid: "full-compliance-report",
  },
} as const;
