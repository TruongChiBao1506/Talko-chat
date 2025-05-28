import axiosClient from './axiosClient';
const BASE_URL = 'users';

const userApi = {
    fetchUser: (username) => {
        return axiosClient.get(`${BASE_URL}/search/username/${username}`);
    },
    fetchUserById: (userId) => {
        return axiosClient.get(`${BASE_URL}/search/id/${userId}`);
    },
};

export default userApi;