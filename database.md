# WhiteCat Bot - Data cần lưu vào Database

## 🔐 USER & AUTH
- Thông tin user Discord (id, username, email)
- OAuth tokens (access, refresh)
- OAuth level (none/basic/advanced)
- Ngôn ngữ user chọn
- User bị ban (lý do, thời gian, permanent hay tạm thời)

## 💰 TIỀN TỆ
- Tiền của user (coin, point, premium currency)
- Lịch sử giao dịch (kiếm/tiêu/chuyển/mua)
- Streak daily/weekly rewards

## 🖥️ HOSTING
- Gói hosting có sẵn (tên, giá, RAM, CPU, storage)
- Hosting user đã mua (tên, port, ngày hết hạn, email liên hệ)
- Trạng thái hosting (active/expired/suspended)
- Auto-renew hay không
- Lịch sử gia hạn
- Port đã cấp/còn trống
- **Lưu ý:** Mua hosting yêu cầu user phải có email (OAuth advanced)

## 🌐 REVERSE PROXY
- Domain/subdomain → port mapping
- SSL enabled hay không

## 🎮 DISCORD GUILDS
- Thông tin server (id, name)
- Ngôn ngữ mặc định server
- Prefix server (mặc định: !)
- Settings server

## 🔗 WEBHOOKS
- URL webhook
- Events listen
- Active hay không

## 📊 STATISTICS (optional)
- Tổng users, guilds
- Commands executed
- Revenue
- Hosting đang active

## 🎁 GIVEAWAY
- Thông tin giveaway (prize, guild_id, channel_id, message_id)
- Số lượng winners
- Yêu cầu tham gia (role, level, coin minimum)
- Thời gian kết thúc
- Trạng thái (active/ended/cancelled)
- Danh sách participants (user_id, joined_at)
- Winners đã chọn