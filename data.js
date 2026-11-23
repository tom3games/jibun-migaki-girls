// 文言とデータ（日英）。数値の仕組みは sim.js
// 女の子版（2026-11-23）。仕様の正本は ~/Desktop/claudecode/ideas/jibun-migaki-girls.md
window.D = {
  DAYS: 30,
  MAX: 100,
  START: { soji: 20, naka: 20, mori: 0, money: 30000, hp: 80 },
  H: 60, HH: 75, L: 40,          // 高い・一番上・低いの線
  // 遅れて効く努力: その日にためる量。節目（丸の数）でまとめて効く
  PEND: { run: 2.9, cook: 2.2, sleep: 0.6, study: 3.8, work: 1.3 },
  MILES: [5, 10, 20, 30], MULT: [1.4, 1.7, 2, 2],
  SLIP: 0.85,      // 1〜2日休むと、ためた分がこれだけ残る
  END_MULT: 0.6,   // 30日目に節目に届かなかった分
  SORE: 8,         // 筋肉痛で多めに減る体力
  FAST: { gain: 10, limit: 5, loss: 6, hospLoss: 12 },   // 断食: 1日で見た目+10。5日目に倒れる。リバウンドで前より下がる
  DECAY: 0.45, SALON_KEEP: 18,   // 盛りは寝ると落ちる。サロンの後の4日はある程度もつ
  DATES: [10, 20], DATE_GAP: 20, DATE_GOOD: 50,
  JIBUN_MONEY: 35000,
  // 行動は9つ（2026-11-24 本人「選択肢減りすぎ。美容は無しにして、メイクとスキンケアに分けて」）。上の段がしんどい方、下の段がすぐ効く方
  ACT: {
    run:    { ja: '運動', en: 'Run', slow: 1, snd: 'run' },
    cook:   { ja: '自炊', en: 'Cook', slow: 1, snd: 'cook' },
    study:  { ja: '勉強', en: 'Study', slow: 1, snd: 'study' },
    work:   { ja: '仕事', en: 'Work', slow: 1, snd: 'work' },
    sleep:  { ja: '早寝', en: 'Early bed', slow: 1, snd: 'sleep' },
    makeup: { ja: 'メイク', en: 'Makeup', snd: 'makeup' },
    skin:   { ja: 'スキンケア', en: 'Skincare', money: -3000, snd: 'skin' },
    selfie: { ja: '加工自撮り', en: 'Filter selfie', snd: 'selfie' },
    fast:   { ja: '断食', en: 'Fasting', snd: 'fast' },
  },
  // 物の札の小さい字（効き目のヒント）
  SUB: {
    run: { ja: '体力-25', en: 'Energy-25' }, cook: { ja: '+1,500円', en: '+¥1,500' }, study: { ja: '体力-15', en: 'Energy-15' }, work: { ja: '+8,000円', en: '+¥8,000' }, sleep: { ja: '体力+45', en: 'Energy+45' },
    makeup: { ja: '盛り+', en: 'Glam+' }, selfie: { ja: 'いいね+', en: 'Likes+' }, fast: { ja: 'すぐ細く', en: 'Slim fast' },
  },
  // その日のひとこと。遅れて効く方は「何も変わらない……」
  LINES: {
    run: { ja: ['走った。何も変わらない……', '5km走った。何も変わらない……', '足が重い。何も変わらない……'], en: ['Ran. Nothing changed...', 'Ran 5k. Nothing changed...', 'Heavy legs. Nothing changed...'] },
    cook: { ja: ['野菜を切った。何も変わらない……', 'お弁当を作った。何も変わらない……', '味噌汁がしみる。何も変わらない……'], en: ['Chopped veggies. Nothing changed...', 'Packed a lunch. Nothing changed...', 'Miso soup hit home. Nothing changed...'] },
    study: { ja: ['3ページで寝かけた。何も変わらない……', '単語を20個。何も変わらない……', '問題集を1章。何も変わらない……'], en: ['Nearly slept at page 3. Nothing changed...', '20 new words. Nothing changed...', 'One chapter done. Nothing changed...'] },
    work: { ja: ['残業した。何も変わらない……', '資料を3枚作った。何も変わらない……', '先輩に褒められた。何も変わらない……'], en: ['Overtime. Nothing changed...', 'Made 3 slides. Nothing changed...', 'My senior praised me. Nothing changed...'] },
    sleep: { ja: ['22時に寝た。何も変わらない……', 'スマホを置いて寝た。何も変わらない……', 'よく寝た。何も変わらない……'], en: ['In bed by 10. Nothing changed...', 'Phone down, lights out. Nothing changed...', 'Slept well. Nothing changed...'] },
    makeup: { ja: ['アイラインが決まった', 'まつ毛が上がった', '今日の顔、天才かも'], en: ['Nailed the eyeliner', 'Lashes curled up', "Today's face is genius"] },
    skin: { ja: ['化粧水を5回たたいた', '高い美容液を開けた', '肌がもちっとした気がする'], en: ['Patted toner 5 times', 'Opened the pricey serum', 'Skin feels bouncy, I think'] },
    selfie: { ja: ['いいねが止まらない', '加工で目が2倍になった', '「誰？」とコメントが来た'], en: ["Likes won't stop", 'The filter doubled my eyes', 'Someone commented "Who?"'] },
    fast: { ja: ['今日は水だけ', 'おなかが鳴っている', '冷蔵庫を見ないようにした'], en: ['Only water today', 'My stomach is growling', 'Avoided looking at the fridge'] },
  },
  // 今日のおすすめ（日めくりの赤字）。対象が半額・2倍
  DEALS: [
    { act: 'skin', ja: 'コスメ半額', en: 'Skincare half off' },
    { act: 'work', ja: '時給2倍', en: 'Double wage' },
    { act: 'cook', ja: 'スーパー特売', en: 'Grocery sale' },
  ],
  // できごとの出やすさ（猫とおばあちゃんは別）
  POOL: [['lotto', 2], ['parents', 2], ['cold', 1], ['cafe', 3], ['ramen', 2.5], ['supp', 1.5], ['sale', 2], ['ex', 1.5]],
  // できごと（行動のあとに時々）。c があれば2択。gap は「遅れて効く努力を1日休んだ扱い」
  EVENTS: {
    lotto: { ja: '宝くじが当たった。3,000円', en: 'Won the lottery. 3,000 yen', money: 3000 },
    parents: { ja: '実家から仕送り。お米と1万円', en: 'Care package from home: rice and 10,000 yen', money: 10000 },
    cold: { ja: '風邪をひいた', en: 'Caught a cold', hp: -20 },
    cafe: { ja: '友だちから「新しいカフェ行こ」', en: 'A friend: "New cafe, let\'s go!"', c: [{ ja: '行く 1,500円', en: 'Go 1,500y', money: -1500, hp: 10, gap: 1, res: { ja: 'パンケーキが3段だった', en: 'The pancakes were three tall' } }, { ja: '断る', en: 'Pass', res: { ja: '「また今度ね」と返した', en: 'Replied "next time!"' } }] },
    ramen: { ja: '夜11時。ラーメンの匂いがする', en: '11 p.m. I can smell ramen', c: [{ ja: '食べる', en: 'Eat', hp: 10, gap: 1, res: { ja: '替え玉までした', en: 'Even got a refill' } }, { ja: 'がまん', en: 'Resist', res: { ja: 'お茶を飲んで寝た', en: 'Had tea and slept' } }] },
    supp: { ja: '「飲むだけで痩せるサプリ」を勧められた', en: 'Offered a "just drink it and slim down" supplement', c: [{ ja: '買う 8,000円', en: 'Buy 8,000y', money: -8000, res: { ja: 'ただのラムネだった', en: 'It was just candy' } }, { ja: '断る', en: 'No thanks', res: { ja: 'そっと既読無視した', en: 'Left it on read' } }] },
    sale: { ja: 'コスメのセール通知。「今だけ半額」', en: 'Makeup sale alert: "Half off, today only"', c: [{ ja: '買う 5,000円', en: 'Buy 5,000y', money: -5000, mori: 8, res: { ja: '同じ色のリップが3本になった', en: 'Now I own 3 of the same lipstick' } }, { ja: '閉じる', en: 'Close', res: { ja: '通知を切った', en: 'Turned off alerts' } }] },
    ex: { ja: '元カレから「元気？」', en: 'My ex texted: "How are you?"', c: [{ ja: '返す', en: 'Reply', hp: -10, gap: 1, res: { ja: '朝4時まで電話した', en: 'On the phone until 4 a.m.' } }, { ja: '既読だけ', en: 'Just read it', res: { ja: '既読をつけて寝た', en: 'Read it and went to bed' } }] },
    quit: { ja: 'ふとんから出たくない。今日は走るの、やめたい', en: "Don't want to leave the futon. Skip today's run?", c: [{ ja: 'やめる', en: 'Skip', hp: 15, gap: 1, res: { ja: '二度寝した', en: 'Went back to sleep' } }, { ja: '走る', en: 'Run anyway', res: { ja: '玄関を出たら、案外走れた', en: 'Once outside, it was fine' } }] },
    // 推し活は、たまに起きるできごと（2026-11-23 本人）。乗るとお金が減り、体力も少し減る
    oshi1: { ja: '推しのライブのチケットが当たった', en: 'Won tickets to my idol\'s live show', c: [{ ja: '行く 8,000円', en: 'Go 8,000y', money: -8000, hp: -10, oshi: 1, res: { ja: '声が枯れるまで叫んだ', en: 'Screamed until my voice gave out' } }, { ja: 'やめておく', en: 'Skip it', res: { ja: '配信のアーカイブで我慢した', en: 'Watched the replay instead' } }] },
    oshi2: { ja: '推しの新しいグッズが出た', en: 'New merch from my idol just dropped', c: [{ ja: '買う 6,000円', en: 'Buy 6,000y', money: -6000, hp: -5, oshi: 1, res: { ja: 'アクリルスタンドが3体になった', en: 'Now I own three acrylic stands' } }, { ja: 'やめておく', en: 'Skip it', res: { ja: 'カートに入れたまま寝た', en: 'Fell asleep with it in my cart' } }] },
    oshi3: { ja: '配信で推しに名前を読まれた', en: 'My idol read my name on stream', c: [{ ja: '投げ銭する 5,000円', en: 'Send a tip 5,000y', money: -5000, hp: -5, oshi: 1, res: { ja: '「ありがとう」と言われた気がする', en: 'I think he said thank you' } }, { ja: '見るだけ', en: 'Just watch', res: { ja: 'スクショだけ撮った', en: 'Just took a screenshot' } }] },
    cat: { ja: 'やせた野良猫がこっちを見ている', en: 'A skinny stray cat is staring at me', c: [{ ja: 'エサをやる 500円', en: 'Feed it 500y', money: -500, cat: 1, res: { ja: 'のどを鳴らした', en: 'It purred' } }, { ja: '無視する', en: 'Ignore', res: { ja: '猫は去った', en: 'The cat left' } }] },
    granny: { ja: '隣のおばあちゃんが重い米袋を運んでいる', en: 'The granny next door is hauling a rice sack', c: [{ ja: '手伝う', en: 'Help', hp: -10, soji: 2, granny: 1, res: { ja: 'お茶をもらった', en: 'She gave me tea' } }, { ja: '会釈だけ', en: 'Just nod', res: { ja: '会釈を返された', en: 'She nodded back' } }] },
  },
  // マッチングアプリで会う日（10日目・20日目）
  DATE: {
    head: { ja: 'マッチングアプリの人と会う日', en: 'Meeting your dating-app match' },
    great: { ja: '「写真より、実物のほうがいいね」と言われた', en: '"You look better than your photos," he said' },
    ok: { ja: 'ふつうに楽しかった。次があるかは未定', en: 'It was fun. A second date? Maybe' },
    fail: { ja: '「写真と違う……」と言われて、30分で帰られた', en: '"You don\'t look like your photos..." He left after 30 minutes' },
    pale: { ja: '「顔色悪いよ？」ごはんに誘われたけど、何も食べられなかった', en: '"You look pale?" He took me to dinner. I could not eat' },
    miss: { ja: '病院にいて、会えなかった', en: 'I was in the hospital and missed it' },
    ok1: { ja: 'つぎへ', en: 'Next' },
  },
  // 恋人。並びは図鑑の順。ランクの札は出さない（2026-11-23 本人「ランク入れないで」）。tier は音と計測だけ。決まり方は sim.js の judge
  P: [
    { id: 'kujo', tier: 5, name: { ja: '九条さん', en: 'Kujo' }, tag: { ja: 'ハイスペすぎる人', en: 'Absurdly Perfect' }, say: { ja: 'ケーキ、焼いてきました', en: 'I baked you a cake' }, epi: { ja: '医師で弁護士でパティシエ。結婚式の司会は、彼が保護した犬だった。', en: 'Doctor, lawyer, pastry chef. The wedding MC was a dog he rescued.' }, hint: { ja: 'しんどい方をずっと続けて、会う日もうまくいく', en: 'Keep the hard stuff going and ace a date' } },
    { id: 'saeki', tier: 4, name: { ja: '佐伯さん', en: 'Saeki' }, tag: { ja: '誠実な会社員', en: 'Sincere Office Guy' }, say: { ja: '缶コーヒー、どっちがいい？', en: 'Which coffee do you want?' }, epi: { ja: '毎朝同じ時間に「いってきます」と言う人だった。30年、一度も遅れなかった。', en: 'Said "see you tonight" at the same time every morning. Never late in 30 years.' }, hint: { ja: '素地と中身の両方を高く', en: 'High base and high mind' } },
    { id: 'riku', tier: 4, name: { ja: '陸さん', en: 'Riku' }, tag: { ja: '一緒に走る人', en: 'Running Buddy' }, say: { ja: '明日、朝6時に川で', en: 'Tomorrow, 6 a.m., by the river' }, epi: { ja: 'ふたりで走った距離は、地球を半周した。', en: 'Together they ran halfway around the planet.' }, hint: { ja: '運動を続ける', en: 'Keep running' } },
    { id: 'tanaka', tier: 3, name: { ja: '田中くん', en: 'Tanaka' }, tag: { ja: 'ふつうにいい人', en: 'Just a Nice Guy' }, say: { ja: 'プリン、2個買ってきた', en: 'I bought two puddings' }, epi: { ja: '大きな事件は何もなかった。それがよかった。', en: 'Nothing dramatic ever happened. That was the best part.' }, hint: { ja: 'しんどい方をコツコツ', en: 'Chip away at the hard stuff' } },
    { id: 'minato', tier: 4, name: { ja: '湊さん', en: 'Minato' }, tag: { ja: '料理を一緒にする人', en: 'Cooking Partner' }, say: { ja: '味見して。しょっぱい？', en: 'Taste this. Too salty?' }, epi: { ja: '冷蔵庫の残りだけで、50年ごはんを作り合った。', en: 'Fifty years of dinners made from fridge leftovers.' }, hint: { ja: '自炊を続ける', en: 'Keep cooking' } },
    { id: 'shikaku', tier: 3, name: { ja: '六角さん', en: 'Rokkaku' }, tag: { ja: '資格を48個持つ人', en: 'Owns 48 Certificates' }, say: { ja: '初デートは、検定の会場でどうかな', en: 'First date at an exam hall, maybe?' }, epi: { ja: 'ふたりで資格を取り続けた。結婚指輪の内側には、合格番号が彫ってある。', en: 'We kept collecting certificates. Our rings are engraved with our pass numbers.' }, hint: { ja: '勉強と仕事ばかり', en: 'Only study and work' } },
    { id: 'takeshi', tier: 2, name: { ja: 'タケシ', en: 'Takeshi' }, tag: { ja: 'ジャージの幼なじみ', en: 'Tracksuit Childhood Friend' }, say: { ja: 'アイス、半分いる？', en: 'Want half my popsicle?' }, epi: { ja: 'なんだかんだ、一番笑った50年だった。', en: 'Somehow, the funniest 50 years of my life.' }, hint: { ja: 'どれも中途半端', en: 'A bit of everything, not much of anything' } },
    { id: 'doctor', tier: 2, name: { ja: '先生', en: 'The Doctor' }, tag: { ja: '病院で会った人', en: 'Met at the Hospital' }, say: { ja: '3食、食べてくださいね', en: 'Please eat three meals a day' }, epi: { ja: '出会いは点滴だった。デートは毎回、健康診断になった。', en: 'We met over an IV drip. Every date became a checkup.' }, hint: { ja: '食べずに細くなろうとする', en: 'Try to slim down by not eating' }, secret: 1 },
    { id: 'ren', tier: 2, name: { ja: 'レンくん', en: 'Ren' }, tag: { ja: '顔しか見ない人', en: 'Only Sees Faces' }, say: { ja: 'その顔、毎日その顔でいてね', en: 'Keep that exact face. Every day.' }, epi: { ja: 'すっぴんで会った日から、既読がつかなくなった。', en: 'The day I met him bare-faced, he stopped reading my texts.' }, hint: { ja: 'メイクばかり', en: 'Makeup, makeup, makeup' } },
    { id: 'kakou', tier: 1, name: { ja: '画面の向こうの人', en: 'The Profile Pic' }, tag: { ja: '写真しか知らない人', en: 'Known Only by Photo' }, say: { ja: 'はじめまして（写真で）', en: 'Nice to meet you (in photos)' }, epi: { ja: '加工した写真どうしで3年やりとりした。まだ一度も会っていない。', en: 'Three years of trading filtered photos. Never met once.' }, hint: { ja: '加工した自撮りばかり', en: 'Filtered selfies only' } },
    { id: 'host', tier: 1, name: { ja: '煌くん', en: 'Kirari' }, tag: { ja: 'ホスト', en: 'The Host' }, say: { ja: '姫、今日もかわいいね', en: 'Princess, cute as always' }, epi: { ja: 'シャンパンタワーを3回建てた。貯金は1本も残らなかった。', en: 'Built three champagne towers. Not one yen left.' }, hint: { ja: '推しのお誘いに乗って、お金も使う', en: 'Say yes to your idol and spend' } },
    { id: 'oshi', tier: 1, name: { ja: '推し', en: 'My Idol' }, tag: { ja: '画面から出てこない人', en: 'Never Leaves the Screen' }, say: { ja: '……（ポスター）', en: '...(poster)' }, epi: { ja: '30日、ずっと見つめ合った。向こうは印刷だった。', en: 'We gazed at each other for 30 days. He was a print.' }, hint: { ja: '推しのお誘いには全部乗る', en: 'Say yes to every idol event' } },
    { id: 'tomo', tier: 0, name: { ja: 'ユリカ', en: 'Yurika' }, tag: { ja: '整形をすすめてくる女友達', en: 'Friend With a Clinic Coupon' }, say: { ja: 'あんた、あと少しで完成じゃん', en: "Girl, you're SO close to done" }, epi: { ja: '紹介クーポンは、今も財布に入っている。使っていない。', en: 'The referral coupon is still in my wallet. Unused.' }, hint: { ja: 'メイクとスキンケアばかり', en: 'Only makeup and skincare' } },
    { id: 'kuma', tier: 0, name: { ja: 'くまお', en: 'Kumao' }, tag: { ja: 'ぬいぐるみ', en: 'Teddy Bear' }, say: { ja: '……', en: '...' }, epi: { ja: '30日寝ていた。夢の中では、モテた。', en: 'Slept 30 days. In dreams, I was popular.' }, hint: { ja: 'ずっと寝る', en: 'Just sleep' } },
    { id: 'sagi', tier: 0, name: { ja: '黒田さん', en: 'Mr. Kuroda' }, tag: { ja: '出会い系の詐欺の人', en: 'The Dating Scammer' }, say: { ja: 'いい投資のお話があってね', en: 'I have a great investment for you' }, epi: { ja: '「必ず増える」は、必ず増えなかった。', en: '"Guaranteed returns" were guaranteed not to return.' }, hint: { ja: 'お金に困る', en: 'Run out of money' }, secret: 1 },
    { id: 'jibun', tier: 4, name: { ja: '自分', en: 'Myself' }, tag: { ja: '一番好きな人', en: 'My Favorite Person' }, say: { ja: '今の自分が、一番好き', en: 'I like who I am right now' }, epi: { ja: 'ドアの前には誰もいなかった。鏡の前には、一番好きな人がいた。', en: 'No one was at the door. The one I like most was in the mirror.' }, hint: { ja: 'しんどい方もメイクも、どちらもほどほどに', en: 'Both the hard stuff and makeup, in balance' }, secret: 1 },
    { id: 'granny', tier: 4, name: { ja: 'トメさん', en: 'Granny Tome' }, tag: { ja: '隣のおばあちゃん', en: 'Granny Next Door' }, say: { ja: '孫はね、来られんかった', en: "My grandson couldn't come" }, epi: { ja: '毎日お茶をもらう。肌つやが良くなった。', en: 'Tea every day. My skin is glowing.' }, hint: { ja: 'ご近所にやさしく', en: 'Help the neighbors' }, secret: 1 },
    { id: 'cat', tier: 4, name: { ja: 'ミケ', en: 'Mike the Cat' }, tag: { ja: '猫', en: 'A Cat' }, say: { ja: 'にゃ', en: 'Mew' }, epi: { ja: '毎朝5時に起こされる。幸せだ。', en: 'Woken at 5 a.m. daily. Pure joy.' }, hint: { ja: '小さな命にやさしく', en: 'Be kind to a small life' }, secret: 1 },
  ],
  // 30日後のドアを少しだけ開けた時に、すき間から先に聞こえる一言。正体は明かさず、口ぐせだけ
  PEEK: {
    kujo: { ja: '保護犬の散歩の途中で寄りました', en: 'Dropping by while walking a rescue dog' },
    saeki: { ja: 'すみません、5分前に着いちゃって', en: 'Sorry, I got here five minutes early' },
    riku: { ja: 'はぁ、はぁ……走ってきた', en: 'Huff... huff... I ran here' },
    minato: { ja: '鍋、火にかけっぱなしなんだけど', en: 'I left a pot on the stove, by the way' },
    tanaka: { ja: 'どうも、田中です', en: "Hi, it's Tanaka" },
    shikaku: { ja: '受験票、持った？', en: 'Got your admission ticket?' },
    takeshi: { ja: 'おーい、開けろー', en: 'Heyyy, open up' },
    doctor: { ja: '診察券、忘れてますよ', en: 'You forgot your patient card' },
    ren: { ja: '顔、見せて？', en: 'Show me your face?' },
    kakou: { ja: '（通知の音だけ鳴っている）', en: '(only a notification chime)' },
    host: { ja: '姫〜、お迎えにあがりました', en: 'Princess, your ride is here' },
    oshi: { ja: '（ペンライトの光だけ漏れている）', en: '(only penlight glow leaks through)' },
    tomo: { ja: 'ねえ、いいとこ知ってるんだけど', en: 'Hey, I know a great place' },
    kuma: { ja: '……（もふっ）', en: '...(fluff)' },
    sagi: { ja: 'お金のことで、いいお話が', en: 'About money, I have good news' },
    jibun: { ja: '（誰もいない。風の音だけ）', en: '(no one. just the wind)' },
    granny: { ja: 'お茶、冷めるよ', en: "Your tea's getting cold" },
    cat: { ja: '（カリカリカリ）', en: '(scratch scratch scratch)' },
  },
  // 鏡の自分が変わった時のひとこと（絵の名前は sim.js の mirror）
  ME: {
    me0: { ja: 'すっぴんに戻った', en: 'Back to bare face' }, me_soji1: { ja: '顔色がよくなった', en: 'Healthier glow' }, me_soji2: { ja: '内側から光りだした', en: 'Glowing from within' },
    me_mori1: { ja: 'メイクが決まった', en: 'Makeup on point' }, me_mori2: { ja: 'フル装備', en: 'Full glam mode' },
    me_naka1: { ja: '勉強モード', en: 'Study mode' }, me_naka2: { ja: '仕事ができる顔', en: 'Looks capable' }, me_allhigh: { ja: '最終形態', en: 'Final form' },
    me_run: { ja: '走る人の顔', en: 'Runner face' }, me_cook: { ja: 'エプロンが似合う', en: 'Apron suits me' }, me_tired: { ja: 'クマがすごい', en: 'Massive eye bags' },
    me_fast: { ja: '急に細く……ふらふらする', en: 'Suddenly slim... and dizzy' }, me_hosp: { ja: '点滴中', en: 'On an IV drip' }, me_oshi: { ja: '推し色に染まった', en: 'Dyed in idol colors' }, me_selfie: { ja: '画面の中だけ別人', en: 'A different person on screen' },
  },
  // 称号（一番多くやった行動）
  TITLES: {
    run: { ja: '朝の川の常連', en: 'Riverside Regular' }, cook: { ja: '自炊の人', en: 'Home Cook' }, study: { ja: '図書館の主', en: 'Lord of the Library' }, work: { ja: '仕事の鬼', en: 'Work Demon' }, sleep: { ja: '睡眠の天才', en: 'Sleep Prodigy' },
    makeup: { ja: 'メイクの人', en: 'Makeup Artist' }, skin: { ja: 'もちもち肌の人', en: 'Mochi Skin' }, selfie: { ja: '加工の職人', en: 'Filter Master' }, fast: { ja: '水だけの人', en: 'Water-Only Person' },
  },
  UI: {
    ja: {
      title: '自分磨き30日 女の子編', sub: '恋人は、積み上げた分だけ', start: '30日を始める', how: '遊び方', back: 'もどる', zukan: '恋人図鑑',
      day: n => `${n}日目`, hp: '体力', money: '所持金', soji: '素地', naka: '中身', mori: '盛り',
      noMoney: 'お金が足りない', faint: '倒れた。翌日は寝込む', hosp: '倒れて病院へ。2日入院', nap: '机で寝落ちした', sore: '筋肉痛。何も変わらない……',
      slim: '鏡の自分が細くなった！', mile: () => '続けた分が、まとめて効いた', reset: 'カレンダーの丸が、全部消えた', rebound: 'リバウンドした', moriLost: '寝たら盛りが落ちた',
      chain: '続けた日', rest: n => n >= 2 ? 'あと1日休むと最初から' : '1日休んだ', dateDay: '会う日', dateSoon: n => `会う日まであと${n}日`,
      final: '30日目の夜。ためていた分が少しだけ効いた',
      tut1: '物をタップすると1日たつ', tut2: '上の段は、あとで効く', tut3: '下の段は、すぐ効く', tut4: '30日後、誰かが来る',
      night: 'そして30日がたった', bell: 'ピンポーン', door: 'ドアの向こうに、誰かいる', who: 'ドアの前にいたのは', open: 'ドアを開ける', knock: 'コンコン',
      save: '画像を保存', post: 'Xでポスト', again: 'もう一回', toTitle: 'タイトルへ', next: 'つぎへ',
      invite: '結婚式のご案内', groom: 'あなた', and: 'と', unlocked: (a, b) => `${a} / ${b} 人`, locked: '？？？', hint: 'ヒント', 
      howBody: ['毎日、部屋の物を1つタップして1日すごす。30日で自分を磨く。', '上の段はその日は何も変わらない。続けると、いつか突然まとめて効く。3日空くとやり直し。', '下の段はすぐ効く。でも寝ると落ちて、お金も減る。', '30日後、ドアの前に誰かが来る（全18人）。'],
      credits: '音: Kenney / rubberduck / StarNinjas / Almitory / Kerzoven / artisticdude / wubitog / eXpl0it3r / Saaabaaato / cori / Iwan Sounds / stephan（CC0・Public domain）',
      privacy: 'プライバシー', postText: (p, t) => `30日自分を磨いたら、ドアの前にいたのは「${p}」でした。称号: ${t} #自分磨き30日 #バカゲー`,
      share: '結果', load: '身じたく中',
      tapChat: '顔をタップすると、ふたりのトークが見られる', read: '既読', unread: '未読', send: '送信', chatInput: 'メッセージを入力（1回だけ）', app: 'こいぶみ',
      affBtn: 'この恋の続き、占ってみる？', affNote: '17歳以上',
    },
    en: {
      title: '30-Day Glow-Up: Her Story', sub: 'Your date matches what you build', start: 'Start 30 days', how: 'How to play', back: 'Back', zukan: 'Partner Book',
      day: n => `Day ${n}`, hp: 'Energy', money: 'Money', soji: 'Base', naka: 'Mind', mori: 'Glam',
      noMoney: 'Not enough money', faint: 'Collapsed. Bedridden tomorrow', hosp: 'Collapsed. 2 days in hospital', nap: 'Fell asleep on the desk', sore: 'Sore muscles. Nothing changed...',
      slim: 'My reflection got slimmer!', mile: () => 'It all paid off at once', reset: 'All the calendar circles are gone', rebound: 'Rebound', moriLost: 'Slept, and the glam wore off',
      chain: 'Streak', rest: n => n >= 2 ? 'One more day off resets' : 'Took a day off', dateDay: 'Date day', dateSoon: n => `Date in ${n} days`,
      final: 'Night 30. The saved-up effort paid off a little',
      tut1: 'Tap an object to spend a day', tut2: 'Top row pays off later', tut3: 'Bottom row works now', tut4: 'In 30 days, someone comes',
      night: '30 days later', bell: 'Ding-dong', door: "Someone's behind the door", who: 'At your door is', open: 'Open the door', knock: 'Knock knock',
      save: 'Save image', post: 'Post on X', again: 'Again', toTitle: 'Title', next: 'Next',
      invite: 'Wedding Invitation', groom: 'You', and: '&', unlocked: (a, b) => `${a} / ${b}`, locked: '???', hint: 'Hint', 
      howBody: ['Each day, tap one object in your room. Glow up in 30 days.', 'The top row changes nothing that day. Keep at it and one day it all pays off at once. Skip 3 days and it resets.', 'The bottom row works right away, but wears off overnight and costs money.', 'On day 30, someone comes to your door (18 in all).'],
      credits: 'Sounds: Kenney / rubberduck / StarNinjas / Almitory / Kerzoven / artisticdude / wubitog / eXpl0it3r / Saaabaaato / cori / Iwan Sounds / stephan (CC0 / Public domain)',
      privacy: 'Privacy', postText: (p, t) => `After a 30-day glow-up, "${p}" showed up at my door. Title: ${t} #30DayGlowUp`,
      share: 'Result', load: 'Getting ready',
      tapChat: 'Tap a face to read your chat history', read: 'Read', unread: 'Unread', send: 'Send', chatInput: 'Message (one shot)', app: 'Koibumi',
      affBtn: 'Want a real reading on your love life?', affNote: 'Ages 17+',
    },
  },
}
