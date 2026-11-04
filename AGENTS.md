# Quy Tắc Dự Án: Tiến Lên Miền Nam Genshin Impact 5★

## 1. Đồng bộ Âm thanh & Hình ảnh Video Nộ (`triggerGenshinBurst`)
- Trong `game.js`, âm thanh Nộ (`burstAudio` / `playCharacterBurstVoice`) **chỉ được phép phát** đúng khoảnh khắc khung hình đầu tiên của video Nộ thực sự chạy trên màn hình (`videoEl.onplaying`, `videoEl.currentTime > 0.01`, hoặc trong `requestVideoFrameCallback` khi `mediaTime > 0`).
- Không kích hoạt âm thanh Nộ sớm ở sự kiện `onloadeddata` hoặc `oncanplay` khi video chưa bắt đầu chạy hình.

## 2. Đồng bộ Tài nguyên với Bản App PC Cục bộ (`TienLenGenshin.exe`)
- Mỗi khi thêm nhân vật mới, cập nhật ảnh (`splash/`, `fanart/`), video/âm thanh Nộ (`*_burst.mp4`, `*_burst.ogg`), hoặc sửa `game.js` / `index.html`:
  - Ngoài việc deploy lên Firebase Hosting và GitHub Pages, phải tự động sao chép các file mới/cập nhật vào các thư mục giải nén cục bộ của App PC tại `C:\Users\Mr.Thang\AppData\Local\TienLenGenshin5Sao_v*` để ứng dụng trên máy tính hiển thị ngay lập tức.
  - Luôn duy trì cơ chế fallback tải ảnh/video/audio từ Cloud CDN (`https://tienlenmiennamgenshin.web.app/`) trong `game.js` và `.github/workflows/build-apk.yml`.
