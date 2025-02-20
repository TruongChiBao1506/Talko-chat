const getSummaryName = (name = "") => {
    const tempName = name.trim().split(" ").filter(Boolean); // Loại bỏ khoảng trắng thừa
    return tempName.slice(0, 2).map(word => word[0]).join("").toUpperCase();
};

export default getSummaryName;
