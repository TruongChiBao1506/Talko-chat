import axiosClient from "./axiosClient";

const API_URL = '/me';

const meApi = {
    fetchProfile : () => {
        const url = `${API_URL}/profile`;        
        return axiosClient.get(url);
    },
    updateProfile : (name, dateOfBirth, gender) => {
        const url = `${API_URL}/profile`;
        return axiosClient.put(url, {
            name, dateOfBirth, gender
        });
    },
    changePasswod: (oldPassword, newPassword) => {
        return axiosClient.patch(`${API_URL}/password`, {
            oldPassword,
            newPassword,
        });
    },
    revokeToken: (password, key) => {
        return axiosClient.delete(`${API_URL}/revoke-token`, {
            data: {
                password,
                key,
            },
        });
    },
}

export default meApi;