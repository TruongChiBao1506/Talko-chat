const fileHelpers = {
  /**
   * Mục đích: Lấy tên file từ một URL
    Cách hoạt động:
    1. Tách URL thành mảng bằng dấu '/'
    2. Lấy phần tử thứ 4 (index 3) và tách bằng dấu '-'
    3. Nếu mảng có 3 phần, trả về phần tử cuối
    4. Nếu không, ghép các phần tử từ index 2 trở đi
   */
  getFileName: (url) => {
    const splitArrayTempt = url.split("/");
    const splitArrayName = splitArrayTempt[3].split("-");
    if (splitArrayName.length === 3) {
      return splitArrayName[2];
    } else {
      let temp = "";
      for (let index = 2; index < splitArrayName.length; index++) {
        temp = temp.concat(splitArrayName[index]);
      }

      return temp;
    }
  },
  
  /**
   * Mục đích: Lấy phần mở rộng của file từ tên file
    Cách hoạt động:
    1. Tách tên file thành mảng bằng dấu '.'
    2. Trả về phần tử cuối cùng của mảng
   */
  getFileExtension: (fileName) => {
    const splitArrayTempt = fileName.split(".");
    return splitArrayTempt[splitArrayTempt.length - 1];
  },

  /**
   * Mục đích: Chuyển đổi định dạng ngày tháng từ DD/MM/YYYY sang YYYY-MM-DD
    Cách hoạt động:
    1. Nhận vào mảng gồm 2 chuỗi ngày tháng (startTime và endTime)
    2. Tách mỗi chuỗi thành ngày, tháng, năm
    3.Tạo lại chuỗi ngày tháng theo định dạng mới
   */
  convertDateStringsToServerDateObject: (dateStrings) => {
    const startTime = dateStrings[0];
    const endTime = dateStrings[1];

    const startTimeTempt = startTime.split("/");
    const endTimeTempt = endTime.split("/");

    return {
      startTime: `${startTimeTempt[2]}-${startTimeTempt[1]}-${startTimeTempt[0]}`,
      endTime: `${endTimeTempt[2]}-${endTimeTempt[1]}-${endTimeTempt[0]}`,
    };
  },
};

export default fileHelpers;
