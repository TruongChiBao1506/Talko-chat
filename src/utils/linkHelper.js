// Kiểm tra URL hợp lệ với biểu thức chính quy chính xác hơn
function validURL(str) {
    const pattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_+.~#?&//=]*)/g;
    return pattern.test(str); // Trả về true/false thay vì mảng match (hiệu quả hơn)
}

// Xóa một URL khỏi nội dung
export const replaceConentWithouLink = (content, url) => content.replace(url, '').trim();

// Thay thế tất cả URL trong nội dung bằng thẻ <a>
export const replaceContentToLink = (content, urls) => {
    if (!urls || urls.length === 0) return content; // Nếu không có link, trả về nguyên nội dung

    // Dùng replace với RegExp thay vì split/join để thay thế tất cả link
    urls.forEach(url => {
        content = content.replace(url, `<a target="_blank" href="${url}">${url}</a>`);
    });

    return content;
};

export default validURL;
