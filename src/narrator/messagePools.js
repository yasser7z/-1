module.exports = {
    NIGHT_START: Array.from({ length: 30 }, (_, i) => `حل الظلام، وبدأت الذئاب تبحث عن ضحيتها رقم ${i + 1}.`),
    DAY_START: Array.from({ length: 30 }, (_, i) => `أشرقت الشمس، هل تنجو القرية اليوم؟ استعدوا للمناقشة ${i + 1}.`),
    DEATH_WOLF: Array.from({ length: 30 }, (_, i) => `انتهى أمر أحد القرويين، دماء على العشب ${i + 1}.`),
    DEATH_VILLAGER: Array.from({ length: 30 }, (_, i) => `تم القضاء على أحد الذئاب، لن تعود للقرية ${i + 1}.`),
    CLOSE_VOTE: Array.from({ length: 30 }, (_, i) => `القرار وشيك، التوتر يملأ الأجواء ${i + 1}.`),
    WOLF_WIN: Array.from({ length: 30 }, (_, i) => `الذئاب سيطرت على القرية، النهاية ${i + 1}.`),
    VILLAGER_WIN: Array.from({ length: 30 }, (_, i) => `نجت القرية، السلام عاد مجدداً ${i + 1}.`),
    LOBBY_COUNTDOWN_START: Array.from({ length: 30 }, (_, i) => `بدأ العد التنازلي، استعدوا للصراع ${i + 1}.`),
    LOBBY_COUNTDOWN_CANCEL: Array.from({ length: 30 }, (_, i) => `توقف العد التنازلي، ننتظر المزيد ${i + 1}.`),
    LOBBY_FULL: Array.from({ length: 30 }, (_, i) => `اللوبي مكتمل، المعركة تبدأ الآن ${i + 1}.`),
    INSUFFICIENT_PLAYERS: Array.from({ length: 30 }, (_, i) => `نحتاج المزيد من الشجعان ${i + 1}.`),
    AUTO_ATTACK: Array.from({ length: 30 }, (_, i) => `هجوم عشوائي من الذئب ${i + 1}.`),
    ABSENT_VOTE_ANNOUNCEMENT: Array.from({ length: 30 }, (_, i) => `تصويت غيابي ${i + 1}.`),
    EMERGENCY_RESET: Array.from({ length: 30 }, (_, i) => `تمت إعادة الضبط ${i + 1}.`)
};
