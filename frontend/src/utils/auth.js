import axios from "axios";

const API_URL = "http://127.0.0.1:8000/";

export const registerUser = async (email, username, password) => {
    try {
        const response = await axios.post(`${API_URL}/users/register/`, {email, username, password},
            {withCredentials: true}
        )
        return response.data;
    }
    catch (e) {
        throw new Error("Registration failed!");
    }

}
    

export const loginUser = async (username, password) => {
    try {
        const response = await axios.post(`${API_URL}/users/login/`, {username, password},
            {withCredentials: true}
        )
        return response.data;
    }
    catch (e) {
        throw new Error("Login failed!");
    }
}
    


// Hàm đăng xuất
export const logoutUser = async () => {
  try {
    const response = await axios.post(
      `${API_URL}users/logout/`,
      {},
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    // Ngay cả khi API logout thất bại, chúng ta vẫn muốn xóa trạng thái đăng nhập ở client
    console.error("Logout error:", error);
    // Không ném lỗi để tránh hiển thị thông báo lỗi cho người dùng
    // throw error;
    return { message: "Logged out locally" };
  }
};


// Hàm lấy thông tin người dùng hiện tại
export const getUserInfo = async () => {
  try {
    const response = await axios.get(
      `${API_URL}users/user-info/`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // Không cần log lỗi 401, đây là trường hợp người dùng chưa đăng nhập
      console.log("User not authenticated");
    } else {
      console.error("Error getting user info:", error);
    }
    throw error;
  }
};

export const refreshToken = async () => {
    try {
        const response = await axios.post(`${API_URL}/users/refresh/`, null,
            {withCredentials: true}
        )
        return response.data;
    }
    catch (e) {
        throw new Error("Refreshing token failed!");
    }
    
}