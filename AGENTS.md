# Quy Tắc Dự Án: Tiến Lên Miền Nam Genshin Impact 5★

## 1. Đồng bộ Âm thanh & Hình ảnh Video Nộ (`triggerGenshinBurst`)
- Trong `game.js`, âm thanh Nộ (`burstAudio` / `playCharacterBurstVoice`) **chỉ được phép phát** đúng khoảnh khắc khung hình đầu tiên của video Nộ thực sự chạy trên màn hình (`videoEl.onplaying`, `videoEl.currentTime > 0.01`, hoặc trong `requestVideoFrameCallback` khi `mediaTime > 0`).
- Không kích hoạt âm thanh Nộ sớm ở sự kiện `onloadeddata` hoặc `oncanplay` khi video chưa bắt đầu chạy hình.

## 2. Đồng bộ Tài nguyên với Bản App PC Cục bộ (`TienLenGenshin.exe`)
- Mỗi khi thêm nhân vật mới, cập nhật ảnh (`splash/`, `fanart/`), video/âm thanh Nộ (`*_burst.mp4`, `*_burst.ogg`), hoặc sửa `game.js` / `index.html`:
  - Ngoài việc deploy lên Firebase Hosting và GitHub Pages, phải tự động sao chép các file mới/cập nhật vào các thư mục giải nén cục bộ của App PC tại `C:\Users\Mr.Thang\AppData\Local\TienLenGenshin5Sao_v*` để ứng dụng trên máy tính hiển thị ngay lập tức.
  - Luôn duy trì cơ chế fallback tải ảnh/video/audio từ Cloud CDN (`https://tienlenmiennamgenshin.web.app/`) trong `game.js` và `.github/workflows/build-apk.yml`.

## 3. Tự Động Mở Game Kiểm Thử & Sửa Lỗi Sau Mỗi Bản Cập Nhật
- **Mỗi khi có bản cập nhật mới** (thêm nhân vật, chỉnh sửa kỹ năng `[Q]`, sửa giao diện hoặc logic phòng chơi), bắt buộc phải:
  1. Kiểm tra cú pháp `node --check game.js`.
  2. Tự động mở game trên trình duyệt (qua Playwright / Chrome) để kiểm thử thực tế cả **Chế độ Đấu Bot** lẫn **Chế độ Đấu Với Người (Multiplayer 2 cửa sổ Chủ phòng & Khách)**:
     - Tạo phòng, hiển thị trên Sảnh Bàn, Khách vào phòng, tự động chia bài.
     - Đánh bài, bỏ lượt, kích hoạt Kỹ Năng Nhân Vật `[Q]` và đồng bộ toàn bộ biến trạng thái vòng/lượt (`serializeRoomState` ⇄ `applySyncedStateOnGuest`).
     - Hết giờ 30s (`handleTurnTimeout` / `Bot đánh hộ AFK`) & nút **"✋ Tự Đánh Tiếp"** (`resumeManualPlayFromAfk`).
     - Tổng kết ván đấu, bấm **Sẵn Sàng Ván Tiếp** (`toggleSummaryReady`) và **Rời phòng** sạch sẽ (không để lại bóng ma hay phòng trống).
  3. Nếu phát hiện bất kỳ lỗi Console/PageError hoặc lỗi bất đồng bộ nào trong lúc test, phải **sửa ngay lập tức và chạy test lại cho tới khi đạt 100% PASS** trước khi deploy và báo cáo hoàn tất.
