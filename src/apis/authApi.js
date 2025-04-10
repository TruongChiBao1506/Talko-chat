import axiosClient from "api/axiosClient";

const authApi = {
  login: (username, password) => {
    const url = "/auth/login";
    return axiosClient.post(url, { username, password });
  },
  registry: (name, username, password) => {
    const url = "/auth/registry";
    return axiosClient.post(url, { name, username, password });
  },
  confirmAccount: (username, otp) => {
    const url = "/auth/confirm-account";
    return axiosClient.post(url, { username, otp });
  },
  resetOtp: (username) => {
    const url = "/auth/reset-otp";
    return axiosClient.post(url, { username });
  },
  fetchUser: (username) => {
    const url = `/auth/users/${username}`;
    return axiosClient.get(url);
  },
  confirmPassword: (username, otp, password) => {
    const url = "/auth/confirm-password";
    return axiosClient.post(url, { username, otp, password });
  },
};
export default authApi;
