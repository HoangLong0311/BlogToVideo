import google.generativeai as genai


# --- nhập API key ---
genai.configure(api_key="AIzaSyAJrOlWCmxc-xk_aLX1EqmFQH-3H1BmXE4")

# --- chọn model Gemini ---
model = genai.GenerativeModel("gemini-2.5-flash")

# --- đoạn văn bản dài cần tóm tắt ---
blog_text = """
Trí tuệ nhân tạo đang ngày càng phát triển mạnh mẽ và có tác động lớn đến nhiều lĩnh vực khác nhau.
Trong y tế, AI giúp chẩn đoán bệnh chính xác hơn và hỗ trợ bác sĩ đưa ra phác đồ điều trị phù hợp.
Trong tài chính, các hệ thống AI được dùng để phát hiện gian lận giao dịch và dự báo xu hướng thị trường.
Trong giáo dục, AI hỗ trợ cá nhân hóa việc học, cung cấp nội dung phù hợp với từng học sinh.
Bên cạnh đó, AI còn góp mặt trong giao thông thông minh, sản xuất tự động và thương mại điện tử.
Tuy nhiên, AI cũng đặt ra thách thức về việc làm, quyền riêng tư và an toàn dữ liệu.
Do đó, cần có những quy định và chính sách phù hợp để đảm bảo AI mang lại lợi ích cho xã hội.
"""

# --- prompt yêu cầu Gemini ---
prompt = f"""
Hãy tóm tắt đoạn văn sau thành script để làm đoạn text cho 1 video với độ dài khoảng 1 phút"

Nội dung gốc:
{blog_text}
"""

# --- gọi API ---
response = model.generate_content(prompt)
# for m in genai.list_models():
#     print(m.name)

# --- in kết quả ---
print("\n--- Kịch bản video (tóm tắt) ---\n")
print(response.text)
