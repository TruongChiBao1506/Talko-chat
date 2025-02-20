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
    }
}

export default meApi;