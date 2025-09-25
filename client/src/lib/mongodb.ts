// MongoDB connection utilities (for reference, actual implementation would use Mongoose)
export const getMongoUri = () => {
  const mode = import.meta.env.VITE_MODE || "simulation";
  return mode === 'live' 
    ? import.meta.env.VITE_MONGODB_URI_LIVE || "mongodb://127.0.0.1:27017/neuroscopeq_live"
    : import.meta.env.VITE_MONGODB_URI_SIM || "mongodb://127.0.0.1:27017/neuroscopeq_sim";
};

export const getMode = () => {
  return import.meta.env.VITE_MODE || "simulation";
};

export const getLSLGatewayUrl = () => {
  return import.meta.env.VITE_LSL_GATEWAY_URL || "http://localhost:7070/rt";
};

export const getRTPollInterval = () => {
  return parseInt(import.meta.env.VITE_RT_POLL_INTERVAL_MS || "2000");
};
