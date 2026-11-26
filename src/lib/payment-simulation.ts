export function isLocalPaymentSimulationEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  flag: string | undefined = process.env.LOCAL_PAYMENT_SIMULATION,
): boolean {
  return nodeEnv !== "production" && flag === "true";
}
