const zhTW = {
    "app.title": "HRT 紀錄",
    "nav.home": "總覽",
    "nav.history": "紀錄",
    "nav.settings": "設置",

    "status.estimate": "目前估算濃度",
    "status.weight": "體重",

    "chart.title": "雌二醇濃度（pg/mL）",
    "chart.tooltip.conc": "濃度",
    "chart.tooltip.time": "時間",
    "chart.now": "現在",
    "chart.reset": "重設縮放",

    "timeline.title": "用藥紀錄",
    "timeline.empty": "目前沒有紀錄",
    "timeline.delete_confirm": "確定要刪除這筆紀錄嗎？",
    "timeline.dose_label": "劑量",
    "timeline.bio_label": "生物效應（β）",

    "drawer.title": "工具選單",
    "drawer.clear": "清除所有劑量",
    "drawer.clear_confirm": "確定要刪除所有紀錄？此動作無法復原。",
    "drawer.save": "匯出劑量 JSON",
    "drawer.save_hint": "下載 JSON 備份。",
    "drawer.import": "匯入劑量 JSON",
    "drawer.import_hint": "匯入後將覆蓋現有資料。",
    "drawer.github": "GitHub 儲存庫",
    "drawer.github_desc": "查看原始碼與提出回饋。",
    "drawer.empty_export": "目前沒有可匯出的劑量紀錄。",
    "drawer.import_error": "匯入失敗，請確認檔案內容是否正確。",
    "drawer.import_success": "匯入成功，已更新劑量紀錄。",
    "drawer.close": "關閉選單",
    "drawer.qr": "QR Code 匯入／匯出",
    "drawer.qr_hint": "使用 QR Code 分享或還原資料。",

    "import.title": "匯入資料",
    "export.title": "匯出資料",

    "import.text": "貼上 JSON 文字",
    "import.paste_hint": "請在此貼上 JSON 內容…",
    "import.file": "選擇 JSON 檔案",
    "import.file_btn": "選擇檔案",

    "qr.title": "QR Code 匯入／匯出",
    "qr.export.title": "匯出劑量至 QR Code",
    "qr.export.empty": "目前沒有可匯出的紀錄。",
    "qr.copy": "複製 JSON",
    "qr.copied": "已複製",
    "qr.copy_hint": "也可以直接複製 JSON 文字進行分享。",

    "qr.import.title": "QR Code 匯入",
    "qr.import.file": "上傳 QR Code 圖片",
    "qr.import.scan": "開啟相機掃描",
    "qr.import.stop": "停止掃描",
    "qr.scan.hint": "請將 QR Code 對準取景框中央。",
    "qr.scan.active": "相機已啟動，請對準 QR Code。",
    "qr.upload.hint": "支援 PNG／JPEG 等格式。",

    "qr.error.camera": "無法存取相機。",
    "qr.error.decode": "未偵測到有效的 QR Code。",
    "qr.error.format": "QR Code 內容無效。",
    "qr.help": "資料可能包含個人資訊，請謹慎分享。",

    "error.nonPositive": "不能輸入小於或等於 0 的值",

    "export.encrypt_ask": "要加密匯出嗎？",
    "export.encrypt_ask_desc": "加密後會產生一組隨機密碼，匯入時必須輸入該密碼。",
    "export.password_title": "匯出密碼",
    "export.password_desc": "請妥善保管此密碼，匯入加密檔案時需要使用。",

    "import.password_title": "輸入密碼",
    "import.password_desc": "偵測到加密資料，請輸入密碼以解密。",
    "import.decrypt_error": "解密失敗，密碼錯誤或資料已損毀。",

    "qr.encrypt_label": "加密",

    "btn.add": "新增用藥",
    "btn.save": "儲存",
    "btn.cancel": "取消",
    "btn.edit": "編輯",
    "btn.ok": "確定",
    "btn.copy": "複製",

    "dialog.confirm_title": "確認",
    "dialog.alert_title": "提示",

    "modal.weight.title": "設定體重",
    "modal.weight.desc": "用於估算濃度峰值。",

    "modal.dose.add_title": "新增用藥",
    "modal.dose.edit_title": "編輯用藥",

    "field.time": "用藥時間",
    "field.route": "給藥方式",
    "field.ester": "藥物種類",
    "field.dose_raw": "藥物劑量（mg）",
    "field.dose_e2": "等效 E2（mg）",
    "field.patch_mode": "輸入模式",
    "field.patch_rate": "釋放速率（µg／天）",
    "field.patch_total": "總劑量（mg）",
    "field.sl_duration": "含服時長（分鐘）",
    "field.sl_custom": "自訂 θ",
    "field.gel_site": "塗抹部位",

    "sl.instructions": "含在口中並盡量不要吞嚥，直到達成目標時間。",
    "sl.mode.quick": "快速（2 分）",
    "sl.mode.casual": "隨意（5 分）",
    "sl.mode.standard": "標準（10 分）",
    "sl.mode.strict": "嚴格（15 分）",

    "route.injection": "肌肉注射（Injection）",
    "route.oral": "口服（Oral）",
    "route.sublingual": "舌下（Sublingual）",
    "route.gel": "凝膠（Beta）",

    "gel.site.arm": "手臂（Arm）",
    "gel.site.thigh": "大腿（Thigh）",
    "gel.site.scrotal": "陰囊（Scrotal）",

    "beta.gel": "Beta：凝膠的生物利用率研究有限，數值為近似估計。",
    "gel.site_disabled": "塗抹部位選擇仍在開發中，目前暫不可用。",

    "beta.patch": "Beta：貼片參數為近似值，請紀錄貼上與移除時間。",
    "beta.patch_remove": "只需紀錄移除時間，系統會依貼片佩戴時長自動計算劑量。",

    "route.patchApply": "貼片貼上（Beta）",
    "route.patchRemove": "貼片移除（Beta）",

    "ester.E2": "雌二醇（E2）",
    "ester.EV": "戊酸雌二醇（EV）",
    "ester.EB": "苯甲酸雌二醇（EB）",
    "ester.EC": "環戊丙酸雌二醇（EC）",
    "ester.EN": "己酸雌二醇（EN）",

    "settings.group.general": "一般設置",
    "settings.group.data": "資料管理",
    "settings.group.about": "關於",

    "settings.version": "版本號",

    "drawer.lang": "語言",
    "drawer.lang_hint": "切換介面語言。",

    "drawer.model_title": "模型說明",
    "drawer.model_desc": "了解估算背後的藥物動力學模型。",
    "drawer.model_confirm": "即將前往外部網站（misaka23323.com），是否繼續？",

    "drawer.github_confirm": "即將前往外部網站（github.com），是否繼續？"
} as const;

export default zhTW;

