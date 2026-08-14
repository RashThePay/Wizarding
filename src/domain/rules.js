export const TARGET = { NONE: 'none', FACE: 'face', NAME: 'name' }
export const UNKNOWN_NAME = '__unknown_true_name__'

const spell = (id, name, level, target, order, description, extra = {}) =>
  ({ id, name, level, target, order, description, ...extra })

export const SPELLS = [
  spell('whisper','زمزمه',0,TARGET.NAME,100,'نام حقیقی یک جادوگر را صدا می‌زند و پیوند ایجاد می‌کند.'),
  spell('revelation','مکاشفه',0,TARGET.NONE,98,'یک نام حقیقی تصادفی از میان جادوگران زنده دریافت می‌کند.',{random:'livingName'}),
  spell('study','مطالعه',0,TARGET.NONE,97,'پس از فراخوانی ناموفق شب قبل، یک طلسم ناشناخته از سطح فعلی می‌آموزد.',{random:'unknownAtLevel'}),
  spell('summon','فراخوانی',0,TARGET.NONE,99,'به تعداد سطح تاس می‌اندازد؛ با ۶ طلسمی از سطح فعلی می‌آموزد.',{dice:true,random:'unknownAtLevel'}),
  spell('lock','قفل',1,TARGET.FACE,49,'طلسم اجرا نشدهٔ هدف را در این شب متوقف می‌کند.'),
  spell('silence','سکوت',1,TARGET.FACE,25,'هدف نمی‌تواند طلسم نوع نام اجرا کند.'),
  spell('mask','نقاب',1,TARGET.FACE,31,'هدف نمی‌تواند طلسم نوع چهره اجرا کند.'),
  spell('sanctity','حرمت',1,TARGET.FACE,27,'اگر هدف یکی از اعضای محفل اجراکننده را هدف بگیرد طلسمش شکست می‌خورد.'),
  spell('repeat','تکرار',1,TARGET.FACE,29,'هدف نمی‌تواند طلسم شب قبل خود را تکرار کند.'),
  spell('shield','سپر',1,TARGET.FACE,18,'نخستین طلسم بعدی مؤثر بر هدف را خنثی می‌کند.'),
  spell('nameWard','نام‌بند',1,TARGET.FACE,21,'نخستین طلسم نامی که هدف را هدف بگیرد شکست می‌خورد.'),
  spell('veil','پرده',1,TARGET.FACE,23,'هدف تا پایان شب هدف طلسم‌های نامی قرار نمی‌گیرد.'),
  spell('count','شمارش',1,TARGET.FACE,91,'تعداد طلسم‌های قبلی این شب روی هدف را گزارش می‌کند.'),
  spell('track','ردگیری',1,TARGET.FACE,81,'چهرهٔ هدف انتخابی جادوگر هدف را گزارش می‌کند.'),
  spell('listen','شنود',1,TARGET.FACE,83,'نام حقیقی استفاده‌شده توسط هدف را گزارش می‌کند.'),
  spell('detect','تشخیص',1,TARGET.FACE,85,'نوع طلسم انتخابی هدف را گزارش می‌کند.'),
  spell('circleTrace','رد محفل',1,TARGET.FACE,79,'محفل‌هایی را که تا این لحظه هدف را نشانه گرفته‌اند گزارش می‌کند.'),
  spell('assess','سنجش',1,TARGET.FACE,87,'موفق یا ناموفق بودن طلسم هدف را گزارش می‌کند.'),
  spell('relation','نسبت',1,TARGET.NAME,98,'هم‌محفل بودن صاحب نام و چهرهٔ مقایسه را می‌سنجد.',{compareFace:true}),
  spell('threeNames','سه‌نام',1,TARGET.FACE,98,'بررسی می‌کند نام هدف در سه نام اعلامی هست یا نه.',{threeNames:true}),
  spell('ambush','کمین',1,TARGET.NONE,12,'چهرهٔ تمام هدف‌گیرندگان اجراکننده را گزارش می‌کند.'),
  spell('thorn','خار',1,TARGET.NONE,6,'طلسم نامی که نام حقیقی اجراکننده را به کار ببرد شکست می‌خورد.'),
  spell('nameTrace','رد نام',1,TARGET.FACE,89,'چهرهٔ تمام هدف‌گیرندگان نامی هدف را گزارش می‌کند.'),
  spell('focus','تمرکز',1,TARGET.NONE,99,'یک طلسم ناشناختهٔ سطح یک می‌آموزد.',{random:'unknownLevelOne'}),
  spell('census','سرشماری',1,TARGET.NONE,99,'فراخوانی‌های شب قبل را بر اساس محفل گزارش می‌کند.'),
  spell('echo','طنین',2,TARGET.NONE,9,'نخستین طلسم مؤثر بر اجراکننده روی اجراکنندهٔ آن نیز اعمال می‌شود.'),
  spell('unmask','رفع نقاب',2,TARGET.NAME,98,'چهرهٔ صاحب نام را گزارش می‌کند.'),
  spell('test','آزمون',2,TARGET.NAME,98,'بررسی می‌کند نام و چهرهٔ مقایسه متعلق به یک جادوگرند.',{compareFace:true}),
  spell('nameTaking','نام‌گیری',2,TARGET.FACE,98,'نام تصادفی یک جادوگر زنده از محفل هدف را می‌آموزد.',{random:'circleLivingName'}),
  spell('noviceHunt','شکار نوآموز',2,TARGET.NAME,38,'اگر سطح مؤثر هدف ۱ باشد او می‌میرد.'),
  spell('namePunish','کیفر نام',2,TARGET.NAME,41,'اگر هدف این شب نامی به کار برده باشد می‌میرد.'),
  spell('reduce','فروکاست',2,TARGET.FACE,54,'سطح مؤثر هدف تا پایان شب یک واحد کم می‌شود.'),
  spell('fortress','حصار',2,TARGET.FACE,58,'هدف تا پایان شب بر اثر طلسم نمی‌میرد.'),
  spell('lifeSwap','جان‌بدل',2,TARGET.FACE,60,'مرگ طلسمی هدف را به اجراکننده منتقل می‌کند.'),
  spell('falseName','نام دروغین',2,TARGET.FACE,94,'گزارش‌های نام هدف را با نام شش‌حرفی جایگزین می‌کند.',{fakeName:true}),
  spell('falseTrace','رد جعلی',2,TARGET.FACE,95,'گزارش هدف انتخابی جادوگر هدف را با چهره‌ای جعلی جایگزین می‌کند.',{secondFace:true}),
  spell('rank','سنجش مرتبه',2,TARGET.FACE,76,'سطح مؤثر هدف را گزارش می‌کند.'),
  spell('mirror','آینه',2,TARGET.FACE,33,'نخستین طلسم چهره‌ای بعدی روی هدف را به اجراکننده بازمی‌تاباند.'),
  spell('lastName','نام واپسین',2,TARGET.FACE,93,'اگر هدف این شب بمیرد نام حقیقی او را گزارش می‌کند.'),
  spell('finalWord','واژهٔ پایان',3,TARGET.NAME,47,'هدف می‌میرد مگر اثری از مرگ او جلوگیری کند.'),
  spell('ashGamble','قمار خاکستر',3,TARGET.FACE,44,'هدف می‌میرد؛ اگر نجات پیدا کند اجراکننده می‌میرد.'),
  spell('tomorrowCurse','نفرین فردا',3,TARGET.NAME,63,'مرگ هدف را برای پایان شب بعد زمان‌بندی می‌کند.'),
  spell('eclipse','کسوف',3,TARGET.NAME,52,'سطح مؤثر هدف تا پایان شب ۱ می‌شود.'),
  spell('secondKnot','گره دوم',3,TARGET.NAME,100,'حتی با وجود پیوند قبلی یک پیوند اضافی ایجاد می‌کند.'),
  spell('spellTheft','سرقت ورد',3,TARGET.NAME,97,'یک طلسم دانستهٔ هدف را می‌آموزد.',{random:'targetKnownSpell'}),
  spell('thirdEar','گوش سوم',3,TARGET.NAME,96,'گزارش‌های خصوصی هدف را می‌دزدد.'),
  spell('detour','کج‌راهه',3,TARGET.FACE,35,'نخستین طلسم بعدی روی هدف را به چهرهٔ دوم منحرف می‌کند.',{secondFace:true}),
  spell('oblivion','حکم نیستی',4,TARGET.NAME,68,'هدف با مرگی غیرقابل جلوگیری می‌میرد.'),
  spell('sever','گسست',4,TARGET.NAME,72,'یک پیوند هدف را برای همیشه حذف می‌کند.',{random:'existingLink'}),
  spell('trueExchange','مبادلهٔ حقیقی',4,TARGET.NAME,75,'نام حقیقی اجراکننده و هدف را برای همیشه عوض می‌کند.'),
  spell('absoluteCircle','دایرهٔ مطلق',4,TARGET.FACE,15,'هدف از همهٔ طلسم‌های دیگر مصون می‌شود و طلسم خودش شکست می‌خورد.'),
  spell('paperDeath','مرگ کاغذی',4,TARGET.FACE,100,'مرگ هدف را فقط به‌صورت عمومی اعلام می‌کند.'),
  spell('noReturn','فرمان بی‌بازگشت',4,TARGET.NONE,3,'طلسم بعدی اجراکننده توقف‌ناپذیر می‌شود.'),
]

export const SPELL_BY_ID = Object.fromEntries(SPELLS.map((item) => [item.id, item]))
export const LEVEL_ONE_SPELLS = SPELLS.filter((item) => item.level === 1)

export function levelForLinks(circleCount, count) {
  const thresholds = circleCount === 4 ? [3,4,6] : circleCount === 5 ? [3,5,7] : [3,5,8]
  return count >= thresholds[2] ? 4 : count >= thresholds[1] ? 3 : count >= thresholds[0] ? 2 : 1
}

export const targetLabel = { none: 'بی‌هدف', face: 'چهره', name: 'نام' }
