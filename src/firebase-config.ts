export const firebaseConfig = {
  apiKey: "AIzaSyDk--eX57dwQi6zghujFoPgBU7FwOdf0Jg",
  authDomain: "indigitual-job-copilot.firebaseapp.com",
  projectId: "indigitual-job-copilot",
  appId: "1:376304104202:web:acac71075a1f00c28880f3"
};

export const recaptchaEnterpriseSiteKey = "6LcbVh0uAAAAAHVGLnrZlan2uvKoDHFV95yVpuRp";

export const hasFirebaseConfig = !Object.values(firebaseConfig).some((value) =>
  value.startsWith("REPLACE_")
);

