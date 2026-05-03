-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 046 — Ingest Falcons Extreme Roster Dossier (206 talents)
-- Date: 2026-05-03 / Author: Koge / Cowork session
-- ───────────────────────────────────────────────────────────────────────────
-- Loads verified social + streaming data for 180 of 183 active players from
-- the Manus-produced Falcons_Extreme_Roster_Dossier.
-- 
-- Fields populated per player (only writes non-null values; never overwrites
-- a non-null DB value with null from CSV):
--   instagram + followers_ig
--   youtube + followers_yt
--   tiktok + followers_tiktok
--   x_handle + followers_x
--   facebook + followers_fb
--   snapchat + followers_snap   ← Moaz manually set to 57000 below
--   twitch + followers_twitch
--   kick + followers_kick
--   liquipedia_url
--
-- DOES NOT touch: tier_code, base_rate_anchor, rate_*, audience_market,
-- agency, achievements, or any pricing-relevant column.
-- Reversible by restoring `_players_dossier_snapshot_pre_046`.
-- ═══════════════════════════════════════════════════════════════════════════

drop table if exists public._players_dossier_snapshot_pre_046;
create table public._players_dossier_snapshot_pre_046 as
select id, nickname,
       instagram, followers_ig, youtube, followers_yt,
       tiktok, followers_tiktok, x_handle, followers_x,
       facebook, followers_fb, snapchat, followers_snap,
       twitch, followers_twitch, kick, followers_kick,
       liquipedia_url, followers_data_updated_at, updated_at
  from public.players;

-- ─── Bulk upsert from CSV via inline VALUES table ─────────────────────────
with d (id, instagram, followers_ig, youtube, followers_yt, tiktok, followers_tiktok,
        x_handle, followers_x, facebook, followers_fb, snapchat, followers_snap,
        twitch, followers_twitch, kick, followers_kick, liquipedia_url) as (values
  (23, 'https://www.instagram.com/gmhikaru/', 1300000, 'https://www.youtube.com/@gmhikaru', 3150000, 'https://www.tiktok.com/@gmhikaru', 732100, 'https://x.com/GMHikaru', 630500, 'https://www.facebook.com/GMHikaru/', 323845, 'https://www.snapchat.com/add/hikarunakamura1', null, 'https://twitch.tv/gmhikaru', 2007866, 'https://kick.com/gmhikaru', 200500, 'https://liquipedia.net/chess/Hikaru_Nakamura'),
  (183, 'https://www.instagram.com/imperialhal/', 138000, 'https://www.youtube.com/channel/UCoBPNJrFc88ZTA31LKx2X1g', 376000, 'https://www.tiktok.com/@imperialhalofficial', 7381, 'https://x.com/ImperialHal', 449300, 'https://www.facebook.com/TSMFTXImperialHal/', 2969, null, null, 'https://www.twitch.tv/imperialhal__', 1280000, null, null, 'https://liquipedia.net/apexlegends/ImperialHal'),
  (27, 'https://www.instagram.com/m0nesy13/', 593000, 'https://www.youtube.com/channel/UCJxjKA1Cl--4tCN1l_cHHvQ', 276000, 'https://www.tiktok.com/@m0nesy', 94900, 'https://x.com/FLCm0NESY', 329600, null, null, null, null, 'https://www.twitch.tv/m0nesyof', 1216800, null, null, 'https://liquipedia.net/counterstrike/M0NESY'),
  (65, 'https://www.instagram.com/peterbotfn/', 213000, 'https://www.youtube.com/@PeterbotFN', 947000, 'https://www.tiktok.com/@realpeterbotfn', 703700, 'https://x.com/PeterbotFN', 478900, 'https://www.facebook.com/p/Peterbot-61556734722697/', 255, 'https://www.snapchat.com/add/peterbot1174', null, 'https://www.twitch.tv/peterbot', 1163845, 'https://kick.com/peterbot', 2100, 'https://liquipedia.net/fortnite/Peterbot'),
  (168, 'https://www.instagram.com/flaptzyofficial/', 114000, 'https://www.youtube.com/flapgaming', 65000, 'https://www.tiktok.com/@flapofficial', 691100, 'https://x.com/flapteezyy', 52000, 'https://facebook.com/flapteezy', 887000, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/FlapTzy'),
  (28, 'https://instagram.com/csgoniko/', 666000, 'https://youtube.com/@NiKo_cs', 69800, 'https://tiktok.com/@csgoniko1', 15400, 'https://x.com/NiKoCS_', 891440, 'https://facebook.com/csgoNiKo', 141000, null, null, 'https://twitch.tv/NiKo', 735897, null, null, 'https://liquipedia.net/counterstrike/NiKo'),
  (186, 'https://www.instagram.com/clayster/', 215000, 'https://www.youtube.com/c/Clayster', 272000, null, null, 'https://x.com/Clayster', 693200, 'https://www.facebook.com/CoDClayster/', 3965, null, null, 'https://www.twitch.tv/clayster', 284065, null, null, 'https://liquipedia.net/callofduty/Clayster'),
  (95, 'https://www.instagram.com/hadjizy/', 84000, 'https://www.youtube.com/@HADJIGAMING', 30200, 'https://www.tiktok.com/@hadjizy_', 197400, null, null, 'https://facebook.com/Hadjizyyyyy', 655000, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Hadji'),
  (51, 'https://www.instagram.com/flc_vejrgang/', 232843, 'https://www.youtube.com/AndersVejrgangofficial', 175000, 'https://www.tiktok.com/@andersvejrgang', 46900, 'https://x.com/FLC_Vejrgang', 81200, null, null, null, null, 'https://www.twitch.tv/anders_vejrgang', 651033, null, null, 'https://liquipedia.net/easportsfc/Vejrgang'),
  (50, 'https://www.instagram.com/msdossary7/', 481000, 'https://youtube.com/@Msdossary', 714000, 'https://tiktok.com/@msdossary7', 164500, 'https://x.com/msdossary7', 566000, null, null, 'https://snapchat.com/add/msdosary7', null, 'https://twitch.tv/msdossary7', 248032, null, null, 'https://liquipedia.net/easportsfc/Msdossary'),
  (126, 'https://www.instagram.com/tgltnpubg/', 39000, 'https://www.youtube.com/@TGLTN', 383000, 'https://www.tiktok.com/@tgltnpubg', 176100, 'https://x.com/tgltnPUBG', 47200, 'https://www.facebook.com/xxxTnPubg/', 3200, null, null, 'https://www.twitch.tv/TGLTN', 491000, 'https://kick.com/tgltn', 4900, 'https://liquipedia.net/pubg/TGLTN'),
  (25, 'https://www.instagram.com/flckyousuke/', 79000, null, null, 'https://www.tiktok.com/@flckyousuke', 968, 'https://x.com/FLCkyousuke', 40900, null, null, null, null, 'https://www.twitch.tv/kyousuke999', 266000, 'https://kick.com/kyousuke', 142, 'https://liquipedia.net/counterstrike/Kyousuke'),
  (67, 'https://www.instagram.com/g1ntl/', 91700, 'https://www.youtube.com/@g1ntl', 264000, 'https://www.tiktok.com/@g1ntl6', 18200, 'https://x.com/g1ntl', 106900, null, null, 'https://www.snapchat.com/add/gntl.i', 11300, 'https://www.twitch.tv/gntl', 230953, null, null, 'https://liquipedia.net/callofduty/GntL'),
  (42, 'https://www.instagram.com/cr1tdota', 58000, 'https://www.youtube.com/cr1tdota', 9250, null, null, 'https://x.com/Cr1tdota', 148800, 'https://www.facebook.com/Cr1tdota', 29000, null, null, 'https://www.twitch.tv/cr1tdota', 236000, null, null, 'https://liquipedia.net/dota2/Cr1t-'),
  (21, 'https://www.instagram.com/hisokat42/', 33000, 'https://www.youtube.com/@hisokat42', 48800, 'https://www.tiktok.com/@falconsoka', 38900, 'https://x.com/HisokaT42', 39000, 'https://www.facebook.com/SokaSZN/', 29, null, null, 'https://www.twitch.tv/hisokat42', 221655, 'https://kick.com/hisokat42', 21, 'https://liquipedia.net/callofduty/Soka'),
  (171, 'https://www.instagram.com/duckeyyyy/', 25000, null, null, 'https://www.tiktok.com/@duckeythevillain', 3891, null, null, 'https://www.facebook.com/duckeyyythevillain', 217000, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Ducky'),
  (2, 'https://www.instagram.com/k2nn8/', 79000, 'https://www.youtube.com/@k2nn8', 117000, 'https://www.tiktok.com/@k2nn8', 212900, 'https://x.com/K22N8', 45600, null, null, 'https://www.snapchat.com/@abonajd', null, 'https://www.twitch.tv/k2nnn8', 60900, null, null, null),
  (14, 'https://www.instagram.com/arcitys9/', 25000, 'https://www.youtube.com/Arcitys', 14100, null, null, 'https://x.com/Arcitys', 191700, null, null, null, null, 'https://www.twitch.tv/arcitys', 141224, null, null, 'https://liquipedia.net/callofduty/Arcitys'),
  (8, 'https://www.instagram.com/vacwep_/', 34000, 'https://www.youtube.com/@vacwep', 36900, 'https://www.tiktok.com/@vacwep', 193700, 'https://x.com/vacwep', 25900, 'https://www.facebook.com/people/%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%84%D9%87-%D8%A7%D9%84%D8%B3%D9%84%D9%8A%D9%85%D9%8A/100092418459373/', 64000, null, null, 'https://twitch.tv/vacwep', 8068, 'https://kick.com/vacwep', 9100, null),
  (69, 'https://www.instagram.com/spyerfrog/', 73000, 'https://www.youtube.com/@Spyerfrog', 182000, null, null, 'https://x.com/spyerfrog', 83900, null, null, null, null, 'https://www.twitch.tv/spyerfrog', 182507, null, null, 'https://liquipedia.net/fortnite/Spy'),
  (160, 'https://www.instagram.com/carljrtm/', 12000, 'https://www.youtube.com/@CarlJrtm', 51100, 'https://www.tiktok.com/@carljrtm', 3232, 'https://x.com/CarlJrtm', 82500, 'https://www.facebook.com/CarlJr.TM/', 1900, null, null, 'https://www.twitch.tv/carljrtm', 180648, null, null, 'https://liquipedia.net/trackmania/Carl_Jr.'),
  (12, 'https://www.instagram.com/amerzulbeariii/', 37000, 'https://www.youtube.com/@Pred_AG', 63100, 'https://www.tiktok.com/@pred_ag', 23700, 'https://x.com/Pred', 137900, null, null, null, null, 'https://www.twitch.tv/pred', 175400, null, null, 'https://liquipedia.net/callofduty/Pred'),
  (1, 'https://www.instagram.com/bijjw/', 26000, 'https://www.youtube.com/@Bijw', 167000, 'https://www.tiktok.com/@biijw', 3599, 'https://x.com/_bijw', 11800, null, null, 'https://www.snapchat.com/add/bijw', null, 'https://www.twitch.tv/bijw', 62700, 'https://kick.com/bijw', 4600, null),
  (167, 'https://www.instagram.com/pollofnn/', 968, 'https://www.youtube.com/channel/UCZqBdOYsCpvvCfI5_R3-FCQ', 134000, null, null, 'https://x.com/pollofn6', 156800, null, null, null, null, 'https://www.twitch.tv/pollofn6', 146000, null, null, 'https://liquipedia.net/fortnite/Pollo'),
  (22, 'https://www.instagram.com/alirezafirouzja/', 149000, 'https://www.youtube.com/@alirezafirouzja4080', 46900, 'https://www.tiktok.com/@alirezafirouzja.official', 1755, 'https://x.com/AlirezaFirouzja', 92900, 'https://www.facebook.com/Alireza.Firouzja.chess/', 1300, null, null, 'https://www.twitch.tv/alirezafirouzja', 113000, null, null, 'https://liquipedia.net/chess/Alireza_Firouzja'),
  (106, 'https://www.instagram.com/livia.lemmuela/', 295000, 'https://www.youtube.com/@LiviaLivii', 35400, 'https://www.tiktok.com/@livia.lemmuela', 96800, null, null, null, null, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Lipii'),
  (36, 'https://www.instagram.com/natosaphix/', 3800, 'https://www.youtube.com/NaToSaphiX', 137000, null, null, 'https://x.com/NaToSaphiX', 30400, 'https://www.facebook.com/NaToSaphiXcs', 6300, 'https://snapchat.com/add/Na2Public', null, 'https://www.twitch.tv/natosaphix', 110271, null, null, 'https://liquipedia.net/counterstrike/NaToSaphiX'),
  (44, 'https://www.instagram.com/kurtisling/', 461, 'https://www.youtube.com/user/KurtisLing', 12900, null, null, 'https://x.com/Aui_2000', 124700, 'https://www.facebook.com/Aui2000dota', 30000, null, null, 'https://www.twitch.tv/aui_2000', 80599, null, null, 'https://liquipedia.net/dota2/Aui_2000'),
  (9, 'https://www.instagram.com/cellium/', 38000, 'https://www.youtube.com/cellium', 20200, 'https://www.tiktok.com/@celliummc', 6573, 'https://x.com/Cellium', 129700, null, null, null, null, 'https://www.twitch.tv/Cellium', 105701, 'https://kick.com/cellium', 1, 'https://liquipedia.net/callofduty/Cellium'),
  (193, 'https://www.instagram.com/karrigancsgo/', 164000, 'https://www.youtube.com/@karrigan9418', 166000, 'https://www.tiktok.com/@karrigancsgo', 89500, 'https://x.com/karriganCSGO', 558700, 'https://www.facebook.com/karriganCSGO', 44000, null, null, 'https://www.twitch.tv/karrigango', 142534, null, null, 'https://liquipedia.net/counterstrike/Karrigan'),
  (76, 'https://www.instagram.com/onfirebaby__/', 21000, 'https://www.youtube.com/@phulipatyosit8415', 23, 'https://www.tiktok.com/@onfireeieii', null, null, null, 'https://www.facebook.com/phulipat.yosit/', null, null, null, null, null, null, null, 'https://liquipedia.net/freefire/ONFIRE'),
  (68, 'https://www.instagram.com/inm7x/', 41000, 'https://www.youtube.com/@iNm7x', 55700, null, null, 'https://x.com/iNm7x', 33900, null, null, null, null, 'https://www.twitch.tv/iiNm7x', 61000, null, null, 'https://liquipedia.net/fortnite/NM7'),
  (180, 'https://www.instagram.com/thewind_me/', 33000, 'https://www.youtube.com/@ShadyCrossfire94', 86900, 'https://www.tiktok.com/@shadycrossfire1994', 36700, null, null, 'https://www.facebook.com/Shadycrossfirevn', 144000, null, null, null, null, null, null, 'https://liquipedia.net/crossfire/Shady'),
  (104, 'https://www.instagram.com/fajria.noviana/', 70000, 'https://www.youtube.com/@fajriaviolet8967', 16800, 'https://www.tiktok.com/@fajriaviolet', 20900, null, null, null, null, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Violet'),
  (32, 'https://www.instagram.com/zonic/', 80000, null, null, null, null, 'https://x.com/zonic', 121500, 'https://www.facebook.com/Danny.zonic/', 15000, null, null, 'https://www.twitch.tv/zonic', 2741, null, null, 'https://liquipedia.net/counterstrike/Zonic'),
  (93, 'https://www.instagram.com/flcn.owgwen/', 14000, null, null, 'https://www.tiktok.com/@ogiiiieeen', 67100, 'https://x.com/Ogiiiieeen', 817, 'https://facebook.com/Ogiiiieeen', 14000, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Owgwen'),
  (7, 'https://www.instagram.com/mezostrong/', 18000, 'https://www.youtube.com/channel/UCZCgW8WW8K_vrHrO6sZ7oyg', 36400, 'https://www.tiktok.com/@mezostrong', 20100, 'https://x.com/mezostrong', 21500, null, null, 'https://www.snapchat.com/add/mezo_jr96', null, null, null, 'https://kick.com/MezoStrong', 40100, null),
  (113, 'https://www.instagram.com/is.fantasea/', 70000, 'https://www.youtube.com/@Isfantasea', 407, 'https://www.tiktok.com/@isfantasea', 1925, 'https://x.com/isfantasea', 8969, 'https://www.facebook.com/isfan.satria.wijaya/', null, null, null, null, null, null, null, null),
  (134, 'https://www.instagram.com/yuzussssss/', null, null, null, null, null, 'https://x.com/Yuzus_', 9754, null, null, null, null, 'https://www.twitch.tv/Yuzus', null, null, null, 'https://liquipedia.net/rainbowsix/Yuzus'),
  (97, 'https://www.instagram.com/vrendonlin/', 37000, null, null, 'https://www.tiktok.com/@vrendonlin', 13500, null, null, 'https://www.facebook.com/kutspogi', 7856, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Vren'),
  (6, 'https://www.instagram.com/pg_ghala3/', 16000, null, 577, 'https://www.tiktok.com/@pg_ghala3', 22900, 'https://x.com/pg_ghala3?lang=en', 8595, null, null, null, null, null, null, 'https://kick.com/pg-ghala3', 4100, 'https://liquipedia.net/pubgmobile/Ghala'),
  (94, 'https://www.instagram.com/marcomarco06/', 53, 'https://www.youtube.com/@superrmarco_', 17, 'https://www.tiktok.com/@flcnsupermarco', 35100, null, null, 'https://www.facebook.com/FLCNSupermarco', 63000, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/SUPER_MARCO'),
  (49, 'https://www.instagram.com/javivillar7/', 1440, 'https://www.youtube.com/@javivillar7', 5070, 'https://www.tiktok.com/@javivillar7', 29200, 'https://x.com/Javivillar7', 14100, null, null, null, null, 'https://www.twitch.tv/javivillar7', 1000, null, null, null),
  (139, 'https://www.instagram.com/kiileerrz/', 34000, null, null, 'https://www.tiktok.com/@kiileerrz1', 46600, 'https://x.com/kiileerrz', 60500, null, null, null, null, 'https://www.twitch.tv/kiileerrz', 13900, 'https://kick.com/kiileerrz', 108, 'https://liquipedia.net/rocketleague/Kiileerrz'),
  (77, 'https://www.instagram.com/pee_2006._/', null, null, null, 'https://www.tiktok.com/@peena._', 26400, null, null, null, null, null, null, null, null, null, null, 'https://liquipedia.net/freefire/PEENA'),
  (100, 'https://www.instagram.com/names_se/', 7100, null, null, null, null, null, null, null, null, null, null, 'https://www.twitch.tv/namesse', null, null, null, 'https://liquipedia.net/mobilelegends/Names'),
  (169, 'https://www.instagram.com/kyletzyofficial/', 21000, 'https://www.youtube.com/c/Kylegaming21', 319, null, null, null, null, 'https://facebook.com/KyleTzyOfficial', 60000, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/KyleTzy'),
  (130, 'https://www.instagram.com/juliogiacomelli/', 21000, 'https://www.youtube.com/@JulioGiacomelli', 4, null, null, 'https://x.com/JULIOAKAJULIO1', 60700, null, null, null, null, 'https://www.twitch.tv/juliojuliojuliojuliojulio', 35000, null, null, 'https://liquipedia.net/rainbowsix/Julio'),
  (108, 'https://www.instagram.com/livyrenata/', 3000000, 'https://www.youtube.com/@LivyRenata', 1200000, 'https://www.tiktok.com/@livyyrenata', 3300000, 'https://x.com/livyyrenata', 346600, 'https://www.facebook.com/p/Livy-Renata-100082593348087/', 197000, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Liv'),
  (66, 'https://www.instagram.com/fahadclipz/', 18000, 'https://www.youtube.com/channel/UCirB2U3_ftMXnLulm04-k4w', 6, null, null, 'https://x.com/Fahadclipz', 28600, null, null, null, null, 'https://www.twitch.tv/fahadfn', 42868, null, null, 'https://liquipedia.net/fortnite/FHD_(Fahad_Almutairi)'),
  (70, 'https://www.instagram.com/yonxfn/', 6792, 'https://www.youtube.com/channel/UCSKgsqUfo7vA4BuBvtf6vwg', 16500, null, null, 'https://x.com/YonxFN', 10300, null, null, null, null, 'https://www.twitch.tv/YonxFN', 9700, null, null, 'https://liquipedia.net/fortnite/Yonx'),
  (110, null, null, null, null, 'https://www.tiktok.com/@putraeka672_', 11000, null, null, null, null, null, null, null, null, null, null, null),
  (165, null, null, 'https://www.youtube.com/channel/UC4Zh2qa4jYyE2Rmy8KGINLQ', 14300, 'https://www.tiktok.com/@swooty', 1586, 'https://x.com/SwootyWRLD', 9431, null, null, null, null, 'https://twitch.tv/swooty18', 28534, null, null, 'https://liquipedia.net/callofduty/Swooty'),
  (175, 'https://www.instagram.com/shirazigo/', 12000, null, null, null, null, 'https://x.com/shirazigo', 16058, null, null, null, null, 'https://www.twitch.tv/shirazigo', 4498, null, null, 'https://liquipedia.net/valorant/Shirazi'),
  (151, 'https://www.instagram.com/farzeen_tk/', 7900, 'https://www.youtube.com/@FalcFarzeen', 3180, null, null, 'https://x.com/Farzeen_tk', 6004, 'https://www.facebook.com/p/Fate-Farzeen-100080799277165/', 175, null, null, null, null, null, null, 'https://liquipedia.net/fighters/Farzeen'),
  (173, 'https://www.instagram.com/jumer6s/', 4338, 'https://www.youtube.com/channel/UCUGXHBCVxPiY1yNnl-kB47Q', 2580, null, null, 'https://x.com/jumeR6S', 9167, null, null, null, null, 'https://www.twitch.tv/jumer6', 14182, 'https://kick.com/jume', 31, 'https://liquipedia.net/rainbowsix/Jume'),
  (109, 'https://www.instagram.com/angeliagathaa/', 5900, 'https://www.youtube.com/channel/UCVC_FTw1agEEe8VQAj8Wcvg', 12, 'https://www.tiktok.com/@angeliagathaa', 152, null, null, 'https://www.facebook.com/angeliaagath/', 2000, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Agatha'),
  (74, 'https://www.instagram.com/limit_juy/', null, null, null, 'https://www.tiktok.com/@limitxx7', null, null, null, 'https://www.facebook.com/rachata.wanaphurksasilp/', 13000, null, null, null, null, null, null, 'https://liquipedia.net/freefire/LIMIT'),
  (170, 'https://www.instagram.com/edferdz/', null, null, null, 'https://www.tiktok.com/@edferdz', 4563, null, null, 'https://www.facebook.com/edferdz', 638, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Ferdz'),
  (105, 'https://www.instagram.com/xev_vi/', null, null, null, 'https://www.tiktok.com/@xev21', 1112, null, null, null, null, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Xev'),
  (31, 'https://www.instagram.com/aymeinsteintv/', null, null, null, null, null, 'https://x.com/aymeinstein', 5209, null, null, null, null, null, null, null, null, 'https://liquipedia.net/counterstrike/Aymeinstein'),
  (3, 'https://www.instagram.com/fm.g/', null, null, null, null, null, 'https://x.com/iFMG_', 5526, null, null, null, null, 'https://www.twitch.tv/fmg_', null, 'https://kick.com/ifmg', 901, null),
  (135, 'https://www.instagram.com/pauldroal/', 1000, 'https://www.youtube.com/@frenchir6s', 2350, 'https://www.tiktok.com/@frenchir6s_', 1259, 'https://x.com/frenchir6s', 6143, null, null, null, null, 'https://www.twitch.tv/frenchir6s', 14253, null, null, 'https://liquipedia.net/rainbowsix/Frenchi'),
  (196, 'https://www.instagram.com/gustavbloend/', 4297, 'https://www.youtube.com/channel/UCM1jYY0D3eq0K9azuIQ3SWA', 113, null, null, 'https://x.com/GustavQQ', 9352, null, null, null, null, 'https://www.twitch.tv/gustavqq', null, null, null, 'https://liquipedia.net/pubg/Gustav'),
  (80, 'https://www.instagram.com/joseserranoo_/', 4200, null, null, 'https://tiktok.com/@joseserrano__16', 6189, 'https://x.com/JoseSerrano_16', 6298, null, null, null, null, 'https://twitch.tv/JoseSerrano_16', null, null, null, null),
  (131, 'https://www.instagram.com/likefacr6s/', 4000, null, null, null, null, 'https://x.com/LikEfacR6S', 20400, null, null, null, null, 'https://www.twitch.tv/likefac', 16900, null, null, 'https://liquipedia.net/rainbowsix/LikEfac'),
  (59, null, null, 'https://www.youtube.com/channel/UC-Ksra-atsz4eW5i9ZDAa8A', 4010, null, null, 'https://twitter.com/andytheworld320', 3406, null, null, null, null, null, null, null, null, 'https://liquipedia.net/fighters/Mok'),
  (120, 'https://www.instagram.com/someone_ow/', 3900, null, null, null, null, 'https://x.com/someone0424', 13000, null, null, null, null, 'https://www.twitch.tv/someone_ow_', 15902, null, null, 'https://liquipedia.net/overwatch/Someone'),
  (184, null, null, 'https://www.youtube.com/@Priv4cyy', 2770, 'https://www.tiktok.com/@priv4cyy', 994, 'https://x.com/Privacy_Pleas', 13500, 'https://www.facebook.com/YamanKayal/', 105000, null, null, 'https://www.twitch.tv/priv4cy', 52400, null, null, 'https://liquipedia.net/apexlegends/Privacy'),
  (11, 'https://www.instagram.com/kismet6_/', 3700, 'https://www.youtube.com/@KiSMET6_', 4420, null, null, 'https://x.com/KiSMET6_', 48200, null, null, null, null, 'https://www.twitch.tv/kismet6_', 29858, null, null, 'https://liquipedia.net/callofduty/KiSMET'),
  (111, 'https://www.instagram.com/moziaulus/', 3300, 'https://www.youtube.com/@Moziaulus', 18, 'https://www.tiktok.com/@moziaulus', 108, 'https://x.com/lol_mozia', null, 'https://www.facebook.com/adityakp', null, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Mozia'),
  (82, 'https://www.instagram.com/pol_urra/', 2900, 'https://www.youtube.com/@pol_urra', 105, null, null, 'https://x.com/polurra', 1644, null, null, null, null, 'https://twitch.tv/pol_urra', 1300, null, null, null),
  (118, 'https://www.instagram.com/mer1t_ow/', null, null, null, null, null, 'https://x.com/MER1T_ow', 6237, null, null, null, null, 'https://www.twitch.tv/mer1t_ow', 8500, null, null, 'https://liquipedia.net/overwatch/MER1T'),
  (127, 'https://www.instagram.com/briddr6s/', 2700, 'https://www.youtube.com/@r6pov', 3560, null, null, 'https://twitter.com/BriDR6S', 22700, null, null, null, null, 'https://www.twitch.tv/bridr6s', 14000, null, null, 'https://liquipedia.net/rainbowsix/BriD'),
  (85, 'https://www.instagram.com/boyetdr_/', 2600, null, null, 'https://www.tiktok.com/@bien_chumacera', 5544, null, null, 'https://www.facebook.com/Boyet.Minana/', 8900, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Boyet'),
  (79, 'https://www.instagram.com/sainoiworrawan/', 2400, null, null, 'https://www.tiktok.com/@sainoi_taiyang', 128400, null, null, 'https://www.facebook.com/sainoisusumi', 29000, null, null, null, null, null, null, null),
  (56, 'https://www.instagram.com/dbj_et/', 2300, null, null, 'https://www.tiktok.com/@dbj_et', 152, 'https://x.com/et1120', 4163, 'https://www.facebook.com/Taiwan.1.ET', 62000, null, null, 'https://www.twitch.tv/dbj_et', 3094, null, null, 'https://liquipedia.net/fighters/E.T.'),
  (96, 'https://www.instagram.com/moodysamal/', 382, null, null, 'https://www.tiktok.com/@flcn.moody', 1654, null, null, 'https://www.facebook.com/liquidcoachmoody/', 254, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Coach_Moody'),
  (72, 'https://www.instagram.com/thana_kamruang/', null, 'https://www.youtube.com/@Konan.gamingff', 1910, 'https://www.tiktok.com/@conan.gamer', 178700, null, null, 'https://www.facebook.com/thana.kamruang/', 44000, null, null, null, null, null, null, 'https://liquipedia.net/freefire/Conan'),
  (101, 'https://www.instagram.com/nourhan_shaker22/', 1500, null, null, 'https://www.tiktok.com/@nucci2266', 5058, null, null, 'https://www.facebook.com/Nucci2266', 5400, null, null, null, null, null, null, null),
  (122, 'https://www.instagram.com/machinegunnerusmc/', 1500, 'https://www.youtube.com/@machinegunnerusmctv', 2110, null, null, 'https://x.com/Owenusmc21', 10300, 'https://www.facebook.com/owen.monahan.75/', 10000, null, null, 'https://twitch.tv/machinegunnerusmc', 55094, null, null, 'https://liquipedia.net/pubg/GUNNER'),
  (195, 'https://www.instagram.com/_syylustforlife/', null, null, null, 'https://tiktok.com/@syrinxxofficial', 231700, null, null, 'https://www.facebook.com/people/Syrinx-Plays/61577014588807/', 167, null, null, null, null, null, null, null),
  (107, 'https://www.instagram.com/oliviawijayas/', 12000, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Liv'),
  (99, 'https://www.instagram.com/koba_ashiii/', 1100, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Koba'),
  (58, 'https://www.instagram.com/kindevu4/', 14, 'https://www.youtube.com/channel/UCQevn7lvmrpl3ElLd58YsNQ', 961, null, null, 'https://x.com/kindevu', 18100, null, null, null, null, 'https://twitch.tv/kindevu0827', 2201, null, null, 'https://liquipedia.net/fighters/Kindevu'),
  (192, 'https://www.instagram.com/junkbuckow/', 946, 'https://www.youtube.com/@Junkbuck', 1, null, null, 'https://x.com/JunkBuckOW', 5220, null, null, null, null, 'https://www.twitch.tv/junkbuck', 740, null, null, 'https://liquipedia.net/overwatch/Junkbuck'),
  (161, 'https://www.instagram.com/timmmiej/', 806, 'https://www.youtube.com/Spammiej', 35600, null, null, 'https://x.com/Spammiejj', 10300, 'https://www.facebook.com/Spammiej', 1900, null, null, 'https://www.twitch.tv/spammiej', 71765, null, null, 'https://liquipedia.net/trackmania/Spammiej'),
  (81, 'https://www.instagram.com/falcon_naifx/', 761, 'https://www.youtube.com/channel/UCJfm3tuGK5YZB-ABNH0lyCg', 2, null, null, 'https://x.com/Falcon_Naifx', 501, null, null, null, null, null, null, null, null, null),
  (78, 'https://www.instagram.com/proteto77/', 1005, null, null, null, null, null, null, 'https://facebook.com/pongsatorn.pongsatorn.754', 4000, null, null, null, null, null, null, 'https://liquipedia.net/freefire/PROTETO'),
  (83, 'https://www.instagram.com/falcon_wesam/', 611, 'https://www.youtube.com/channel/UC4xjNjV4ad2b5niGBRrP1XA', 4, null, null, 'https://x.com/Falcon_Wesam', 98, null, null, null, null, null, null, null, null, null),
  (86, 'https://www.instagram.com/cuffin_ml/', 604, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Cuffin'),
  (87, 'https://www.instagram.com/cuffin_ml/', null, null, null, null, null, null, null, 'https://www.facebook.com/KakashiGamingg/', 7000, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Kakashi'),
  (88, 'https://www.instagram.com/cuffin_ml/', null, null, null, null, null, null, null, 'https://www.facebook.com/KakashiGamingg/', 7000, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Kakashi'),
  (117, 'https://www.instagram.com/choooooooong/', 576, null, null, 'https://www.tiktok.com/@levi.ow2', 1087, 'https://x.com/OW_Levi', 2745, null, null, null, null, 'https://twitch.tv/levi', 30726, null, null, 'https://liquipedia.net/overwatch/Levi'),
  (90, 'https://www.instagram.com/trolll_ml/', 565, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Sanji_(Saudi_player)'),
  (53, 'https://www.instagram.com/kreemvv/', 413, null, null, null, null, 'https://x.com/kiimo__1', 1430, null, null, null, null, null, null, null, null, null),
  (119, null, null, 'https://youtube.com/@NineKK999', 457, null, null, 'https://x.com/NineK_OW', 5029, null, null, null, null, null, null, null, null, 'https://liquipedia.net/overwatch/NineK'),
  (17, null, null, 'https://www.youtube.com/channel/UCUWL8dR-JyA4FXZ08aSjjcg', 87, 'https://www.tiktok.com/@xzizx7', 700, 'https://x.com/Jawxd7', 1018, null, null, null, null, 'https://www.twitch.tv/jawad', 5597, null, null, 'https://liquipedia.net/callofduty/Jawad'),
  (35, null, null, 'https://youtube.com/@venocs2', 211, null, null, 'https://x.com/venocs2', 507, null, null, null, null, 'https://twitch.tv/venocs2', 296, null, null, null),
  (84, 'https://www.instagram.com/skwalgg/', 207, null, null, null, null, 'https://x.com/SkwalGG', 981, 'https://www.facebook.com/nicolas.sautron/', null, null, null, null, null, null, null, 'https://liquipedia.net/overwatch/Skwal'),
  (115, null, null, null, null, null, null, 'https://twitter.com/fielder_ow', 13500, null, null, null, null, 'https://www.twitch.tv/fielder_ow', null, null, null, 'https://liquipedia.net/overwatch/Fielder'),
  (37, 'https://www.instagram.com/neoskai/', 84, null, null, null, null, 'https://x.com/Neoskai', 601, null, null, null, null, null, null, null, null, null),
  (137, 'https://www.instagram.com/id7oom_24/', 8882, 'https://www.youtube.com/channel/UCzdPATC3QzK1NLpS3NwtOiA', 5, 'https://www.tiktok.com/@i.d7oom24', 1539, 'https://x.com/id7oom_24', 12500, null, null, null, null, 'https://www.twitch.tv/d7oom_24', 357, null, null, 'https://liquipedia.net/rocketleague/D7oom-24'),
  (30, 'https://www.instagram.com/tesescs/', 22000, null, null, null, null, 'https://x.com/TesesCS', 48128, null, null, null, null, 'https://www.twitch.tv/tesesss', 1275, null, null, 'https://liquipedia.net/counterstrike/TeSeS'),
  (181, null, null, null, null, null, null, 'https://x.com/alpinedadog', 1222, null, null, null, null, null, null, null, null, null),
  (18, null, null, null, null, null, null, 'https://x.com/alpinedadog', 1222, null, null, null, null, null, null, null, null, null),
  (182, 'https://www.instagram.com/draugrau_/', 135, null, null, 'https://www.tiktok.com/@draugrau', 96, 'https://x.com/DraugrAU', 5886, null, null, null, null, 'https://www.twitch.tv/draugrau', 4793, null, null, 'https://liquipedia.net/apexlegends/Draugr'),
  (187, null, null, null, null, null, null, 'https://x.com/Gildersons_', 31400, null, null, null, null, 'https://www.twitch.tv/Gild', 71257, null, null, 'https://liquipedia.net/apexlegends/Gild'),
  (185, 'https://www.instagram.com/benwxltzy/', 1200, 'https://youtube.com/@Wxltzy', 2580, 'https://www.tiktok.com/@wxltzy', 3198, 'https://x.com/Wxltzy', 23800, null, null, null, null, 'https://twitch.tv/wxltzy', 66182, null, null, 'https://liquipedia.net/apexlegends/Wxltzy'),
  (188, null, null, null, null, null, null, 'https://x.com/MoT3yyB', 1154, null, null, null, null, null, null, null, null, 'https://liquipedia.net/callofduty/Mutab'),
  (189, null, null, null, null, null, null, 'https://x.com/JPerry264', 679, null, null, null, null, null, null, null, null, null),
  (10, 'https://www.instagram.com/exnid/', 16400, 'https://www.youtube.com/@Exnid', 3840, 'https://www.tiktok.com/@exnid_', 42600, 'https://x.com/Exnid_', 35900, null, null, 'https://www.snapchat.com/@saud.alotai', null, 'https://www.twitch.tv/exnid', 77504, null, null, 'https://liquipedia.net/callofduty/Exnid'),
  (162, null, null, 'https://www.youtube.com/@TC2Real', 9, null, null, 'https://x.com/MG2ReaL', 5358, null, null, null, null, 'https://twitch.tv/mg2real', 613, null, null, 'https://liquipedia.net/callofduty/2ReaL'),
  (163, null, null, 'https://www.youtube.com/@mannyYT_CODM', 341, 'https://tiktok.com/@mannysnipes_codm', 393, 'https://x.com/Manny7F', 4614, null, null, null, null, 'https://twitch.tv/Manny7F', 3000, null, null, 'https://liquipedia.net/callofduty/Manny'),
  (15, null, null, 'https://www.youtube.com/channel/UCxxL3PGDTMDvSq8cdZiOqHA', 43, 'https://www.tiktok.com/@paulehx', 891, 'https://x.com/Paulehx_', 19400, null, null, 'https://www.snapchat.com/add/paulehx', null, 'https://www.twitch.tv/paulehx', 32500, 'https://kick.com/paulehx', 1, 'https://liquipedia.net/callofduty/PaulEhx'),
  (164, null, null, null, null, null, null, 'https://x.com/Knox__77', 1230, null, null, 'https://snapchat.com/add/hakimalshibani', null, 'https://www.twitch.tv/iimlk_11', null, null, null, 'https://liquipedia.net/callofduty/KnoX'),
  (13, null, null, null, null, 'https://www.tiktok.com/@kingabody_', 1852, 'https://x.com/KingAbody_', 5923, null, null, null, null, 'https://www.twitch.tv/kingabody_', 9878, null, null, 'https://liquipedia.net/callofduty/KingAbody'),
  (16, 'https://www.instagram.com/i_hmoodxx/', null, 'https://www.youtube.com/@HmoodxOW', 6250, 'https://www.tiktok.com/@i_hmoodx', 1215, 'https://x.com/xihamoodx', 3530, null, null, null, null, 'https://www.twitch.tv/i_hmoodx', 24376, null, null, 'https://liquipedia.net/callofduty/Hmoodx'),
  (19, null, null, 'https://www.youtube.com/channel/UCZY_DnDfoS5tSUgE5nIMwqQ', 6130, 'https://www.tiktok.com/@newbz_', 78900, 'https://x.com/TBE_Newbzz', 36200, null, null, null, null, 'https://twitch.tv/newbz', 108000, null, null, 'https://liquipedia.net/callofduty/Newbz'),
  (20, null, null, 'https://www.youtube.com/@zDongy', 10500, 'https://www.tiktok.com/@zdongyy', 1522, 'https://x.com/zDongyy', 9198, null, null, null, null, 'https://twitch.tv/dongy', 62900, null, null, null),
  (24, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  (29, null, null, null, null, null, null, 'https://x.com/Xavier_Roussac', 2735, null, null, null, null, null, null, null, null, 'https://liquipedia.net/counterstrike/Team_Falcons'),
  (166, null, null, null, null, null, null, 'https://x.com/tapewaare', 1653, null, null, null, null, 'https://www.twitch.tv/Tapewaare', 1700, null, null, 'https://liquipedia.net/counterstrike/Tapewaare'),
  (33, null, null, 'https://www.youtube.com/@clockziCS2', 25, null, null, 'https://x.com/flcclockzi', 372, null, null, null, null, 'https://www.twitch.tv/clockzics', null, null, null, null),
  (34, null, null, null, null, null, null, 'https://x.com/grecuFLC', 392, null, null, null, null, 'https://www.twitch.tv/gbcgrecu', null, null, null, null),
  (38, null, null, null, null, null, null, 'https://x.com/NucleonZz', 1493, null, null, 'https://snapchat.com/add/nucleonz', null, 'https://www.twitch.tv/nucleonz', 184, 'https://kick.com/nucleonz', 7, 'https://liquipedia.net/counterstrike/Nucleonz'),
  (39, 'https://www.instagram.com/skiterdota/', 9700, null, null, null, null, 'https://x.com/skiter', 18200, 'https://www.facebook.com/SkiterDota', 4300, null, null, 'https://twitch.tv/skiter_mp4', 3400, null, null, 'https://liquipedia.net/dota2/Skiter'),
  (40, 'https://www.instagram.com/malr1ne/', 6200, null, null, 'https://www.tiktok.com/@mclr1n3', 150, 'https://x.com/Malr1ne_', 3050, null, null, null, null, 'https://www.twitch.tv/malr1ne_dota', 111048, null, null, 'https://liquipedia.net/dota2/Malr1ne'),
  (41, 'https://www.instagram.com/ammar_alassaf/', 17000, null, null, null, null, 'https://x.com/AmmarAlassaf6', 19800, null, null, null, null, 'https://www.twitch.tv/ammar_the_f', 72, null, null, 'https://liquipedia.net/dota2/ATF'),
  (43, 'https://www.instagram.com/sneykinggaming/', 647, null, null, null, null, 'https://x.com/SneykingGaming', 18900, null, null, null, null, 'https://www.twitch.tv/sneykingdota', 51000, null, null, 'https://liquipedia.net/dota2/Sneyking'),
  (45, 'https://www.instagram.com/mohammadomoush/', 1100, null, null, null, null, 'https://x.com/AfrOmoush', 939, 'https://www.facebook.com/RealAfrOmoush', 1500, null, null, 'https://www.twitch.tv/afromoush', 2000, null, null, 'https://liquipedia.net/dota2/AfrOmoush'),
  (46, null, null, null, null, null, null, 'https://x.com/thisisallencook', 1566, null, null, null, null, null, null, null, null, 'https://liquipedia.net/dota2/Bonkers'),
  (47, 'https://www.instagram.com/goatmoh/', 1100, 'https://youtube.com/@Alarfg99', 186, null, null, 'https://x.com/GoatMoh_', 7101, null, null, null, null, 'https://twitch.tv/goatmoh', 981, 'https://kick.com/goatmoh', 16, 'https://liquipedia.net/easportsfc/GoatMoh'),
  (48, null, null, 'https://youtube.com/@Haffouza', 4, 'https://tiktok.com/@haffouza', 20300, 'https://x.com/_Hafez10', 4876, null, null, null, null, null, null, null, null, 'https://liquipedia.net/easportsfc/Hafezitti'),
  (190, 'https://www.instagram.com/the1os_/', 1400, 'https://www.youtube.com/@the1os991', 530, 'https://www.tiktok.com/@the1os', 1732, 'https://x.com/The1OS_', 8586, null, null, null, null, 'https://twitch.tv/the1os', 1974, 'https://kick.com/the1os', 3500, 'https://liquipedia.net/easportsfc/1OS'),
  (55, null, null, null, null, null, null, 'https://x.com/wess21111?lang=en', 3625, null, null, 'https://www.snapchat.com/add/wesam491', null, 'https://twitch.tv/wess211', 46, null, null, 'https://liquipedia.net/fighters/Wess'),
  (154, 'https://www.instagram.com/ghirlandatekken/', 1800, 'https://youtube.com/@ghirlanda', 5030, null, null, 'https://x.com/ghirlandatekken', 6222, 'https://www.facebook.com/ghirlandatekken', 1400, null, null, 'https://www.twitch.tv/ghirl4nd4', 2000, null, null, 'https://liquipedia.net/fighters/Ghirlanda'),
  (57, 'https://www.instagram.com/ghirlandatekken/', 1800, 'https://youtube.com/@ghirlanda', 5030, null, null, 'https://x.com/ghirlandatekken', 6222, 'https://www.facebook.com/ghirlandatekken', 1400, null, null, 'https://www.twitch.tv/ghirl4nd4', 2000, null, null, 'https://liquipedia.net/fighters/Ghirlanda'),
  (148, 'https://www.instagram.com/ghirlandatekken/', 1800, 'https://youtube.com/@ghirlanda', 5030, null, null, 'https://x.com/ghirlandatekken', 6222, 'https://www.facebook.com/ghirlandatekken', 1400, null, null, 'https://www.twitch.tv/ghirl4nd4', 2000, null, null, 'https://liquipedia.net/fighters/Ghirlanda'),
  (60, 'https://instagram.com/fgc_sai', 7, null, null, null, null, 'https://x.com/Zenga83', 1597, null, null, null, null, null, null, null, null, 'https://liquipedia.net/fighters/Sai_(Saudi_Player)'),
  (61, null, null, null, null, null, null, 'https://x.com/ShadowX_FGC', 1143, null, null, null, null, null, null, null, null, 'https://liquipedia.net/fighters/SHADOW_X'),
  (62, 'https://www.instagram.com/chonfx/', 161, 'https://www.youtube.com/@ChonFx', 32, null, null, 'https://x.com/ChonFx', 684, 'https://www.facebook.com/ChonFx/', 1500, null, null, null, null, null, null, 'https://liquipedia.net/fighters/Tamago'),
  (63, null, null, null, null, null, null, 'https://x.com/xyzzylshift', 1229, null, null, null, null, 'https://www.twitch.tv/xyzzyshift', 14390, null, null, 'https://liquipedia.net/fighters/Xyzzy'),
  (64, 'https://www.instagram.com/xiaohai.kof/', 268, 'https://www.youtube.com/@xiaohai8539', 16200, null, null, 'https://x.com/Xiaohai_', 32500, null, null, null, null, null, null, null, null, 'https://liquipedia.net/fighters/Xiao_Hai'),
  (147, 'https://www.instagram.com/xiaohai.kof/', 268, 'https://www.youtube.com/@xiaohai8539', 16200, null, null, 'https://x.com/Xiaohai_', 32500, null, null, null, null, null, null, null, null, 'https://liquipedia.net/fighters/Xiao_Hai'),
  (54, null, null, null, null, null, null, 'https://x.com/RASHED_RT1', 7469, null, null, null, null, 'https://www.twitch.tv/falconrashed', null, 'https://kick.com/sr-rashed', 4, 'https://liquipedia.net/pubgmobile/Rashed'),
  (73, 'https://www.instagram.com/keroro_god/', null, 'https://www.youtube.com/channel/UCrpx6_o1M728EgGiQAE53Pg', 24, 'https://www.tiktok.com/@keroro.13', 61100, null, null, 'https://www.facebook.com/yiw.natthapong', 21000, null, null, null, null, null, null, 'https://liquipedia.net/freefire/KERORO'),
  (89, 'https://www.instagram.com/saanoml/', null, 'https://www.youtube.com/@sano2024', 312, 'https://www.tiktok.com/@saano186', 273, null, null, null, null, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Saano'),
  (91, null, null, 'https://www.youtube.com/channel/UCfPG1v6U4XYszk9NKwsoySw', 139, 'https://www.tiktok.com/@tarzan.gaming2', 3605, null, null, 'https://www.facebook.com/mltarzangaming/', 1200, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Tarzan'),
  (194, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 'https://liquipedia.net/mobilelegends/Falcons_Vega_MENA'),
  (102, 'https://www.instagram.com/nanaelbanana19/', 120, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  (112, null, null, null, null, null, null, null, null, 'https://www.facebook.com/TeamFalconsPH/', 52000, null, null, null, null, null, null, null),
  (114, 'https://www.instagram.com/chiyo_ow/', 2800, null, null, null, null, 'https://x.com/ChiYo_ow1', 10900, null, null, null, null, 'https://www.twitch.tv/chiyo_ow', 15234, null, null, 'https://liquipedia.net/overwatch/ChiYo'),
  (116, 'https://www.instagram.com/hanbin_ow/', 2900, null, null, null, null, 'https://x.com/HanBin_OW', 18600, null, null, null, null, 'https://www.twitch.tv/hanbin_ow', 8902, null, null, 'https://liquipedia.net/overwatch/Hanbin'),
  (172, null, null, null, null, null, null, 'https://x.com/ow_checkmate', 6592, null, null, null, null, 'https://www.twitch.tv/ow_checkmate', 1967, null, null, 'https://liquipedia.net/overwatch/Checkmate'),
  (121, 'https://www.instagram.com/sp9rk1e_ow', null, 'https://www.youtube.com/channel/UCqS9XBZgzXiolPU-s-WX2cQ', 12900, null, null, 'https://x.com/SP9RK1E_OW', 26300, null, null, null, null, 'https://www.twitch.tv/sp9rk1e', 32131, null, null, 'https://liquipedia.net/overwatch/Sp9rk1e'),
  (124, 'https://www.instagram.com/kickstart_matt/', 2300, 'https://www.youtube.com/@KSnKickstart', 13000, 'https://www.tiktok.com/@kickstartpubg', 862, 'https://x.com/KSnKickstart', 12300, 'https://www.facebook.com/matt.smith.929804/', null, null, null, 'https://www.twitch.tv/kickstart', 53148, null, null, 'https://liquipedia.net/pubg/Kickstart'),
  (125, 'https://www.instagram.com/shrimzytv/', 4400, 'https://www.youtube.com/Shrimx1', 18900, null, null, 'https://twitter.com/ShrimzyPUBg', 20900, null, null, 'https://snapchat.com/add/tristan.nowicki', null, 'https://www.twitch.tv/shrimzy', 80500, 'https://kick.com/shrimzy', 1, 'https://liquipedia.net/pubg/Shrimzy'),
  (128, 'https://www.instagram.com/eaglemees/', null, null, 165, null, null, 'https://x.com/eaglemees', 7063, null, null, null, null, 'https://www.twitch.tv/eaglemees', 4, null, null, 'https://liquipedia.net/rainbowsix/Eaglemees'),
  (132, 'https://www.instagram.com/fatihturker_/', 7788, null, 888, null, null, 'https://twitter.com/SolotovR6', 5543, null, null, null, null, 'https://www.twitch.tv/solotov', null, 'https://kick.com/solotov-0', 20, 'https://liquipedia.net/rainbowsix/Solotov'),
  (133, 'https://www.instagram.com/stooflex/', 706, null, null, null, null, 'https://x.com/Stooflex', 6450, null, null, null, null, null, null, null, null, 'https://liquipedia.net/rainbowsix/Stooflex'),
  (136, null, null, 'https://www.youtube.com/channel/UCNOTmEdrCKl6SHroUJeOn4A', 8, 'https://www.tiktok.com/@azzamaljabr', 2682, 'https://x.com/AzzamAljabr', 11200, null, null, null, null, null, null, 'https://kick.com/azzam-001', 10, 'https://liquipedia.net/rocketleague/Azzam'),
  (138, 'https://www.instagram.com/verybadsamy/', 536, null, null, null, null, 'https://x.com/dralii897', 42200, null, null, null, null, 'https://www.twitch.tv/dralii', 80800, null, null, 'https://liquipedia.net/rocketleague/Dralii'),
  (140, 'https://www.instagram.com/rw9_rl/', 38000, null, null, 'https://www.tiktok.com/@rl__rw9', 51500, 'https://x.com/Rw9_RL', 78500, null, null, null, null, 'https://www.twitch.tv/rl_rw9', 20000, 'https://kick.com/rw9-kk', null, 'https://liquipedia.net/rocketleague/Rw9'),
  (144, 'https://www.instagram.com/craime_cl/', 1400, null, null, null, null, 'https://x.com/CraimeCL', 3784, null, null, null, null, 'https://www.twitch.tv/craimecl', 1397, null, null, 'https://liquipedia.net/fighters/Craime'),
  (145, 'https://www.instagram.com/maivinekg/', 1800, null, null, null, null, 'https://x.com/MaivineKusanagi', 7123, null, null, null, null, 'https://www.twitch.tv/kusanagisf6', 5317, null, null, 'https://liquipedia.net/fighters/Kusanagi_(French_Player)'),
  (149, 'https://www.instagram.com/aqeel9h_/', null, null, null, null, null, 'https://x.com/mka988', 865, null, null, null, null, 'https://www.twitch.tv/aqeel9h', 294, null, null, 'https://liquipedia.net/fighters/Aqeel9'),
  (150, 'https://www.instagram.com/tk_atif/', 17800, 'https://www.youtube.com/@Falcons_atif', 26000, 'https://www.tiktok.com/@tk_atif', 12, 'https://x.com/AtifButt540', 19700, 'https://www.facebook.com/p/Atif-Butt-100005805451310/', null, null, null, 'https://www.twitch.tv/tk_atifbutt', 4810, null, null, 'https://liquipedia.net/fighters/Atif_Butt'),
  (152, 'https://www.instagram.com/numanch572/', null, 'https://www.youtube.com/@tknumanch328', 3660, null, null, 'https://x.com/tk_numanch', 3132, 'https://www.facebook.com/Numanameen302/', 12000, null, null, null, null, null, null, 'https://liquipedia.net/fighters/Numan_Ch'),
  (153, 'https://www.instagram.com/usamatekken708/', null, 'https://www.youtube.com/@usamatk708', 765, 'https://www.tiktok.com/@usamaabbasiworld', 138500, 'https://x.com/usamatekken708', 1089, null, null, 'https://snapchat.com/add/usamaabbasi2624', null, null, null, null, null, 'https://liquipedia.net/fighters/Usama_Abbasi'),
  (155, 'https://www.instagram.com/alexyyfrancisco/', 8100, 'https://www.youtube.com/@alexyvalorant', 474, 'https://www.tiktok.com/@alexyph', 7985, 'https://x.com/alexyyfrancisco', 6636, 'https://www.facebook.com/Aleeexyyy', 2500, null, null, 'https://www.twitch.tv/alexyph', 6000, null, null, 'https://liquipedia.net/valorant/Alexy'),
  (156, 'https://www.instagram.com/odelllaaa/', 20000, null, null, 'https://www.tiktok.com/@odelllaaa', 3286, 'https://x.com/eneriiiiiii', 24000, null, null, null, null, 'https://www.twitch.tv/enerii', null, null, null, 'https://liquipedia.net/valorant/Enerii'),
  (157, 'https://www.instagram.com/kamiyuchii/', 4400, null, null, 'https://www.tiktok.com/@kamiyuchii', 2003, 'https://x.com/Kamiyuchii', 5409, 'https://www.facebook.com/kamiwasd/', 734, null, null, 'https://twitch.tv/kamiiyuu', 2399, null, null, 'https://liquipedia.net/valorant/Kamiyu'),
  (158, 'https://www.instagram.com/itmadv/', 115000, 'https://www.youtube.com/user/MadV', null, 'https://www.tiktok.com/@itsmadv', 135800, 'https://x.com/itMadv', 70700, null, null, null, null, 'https://twitch.tv/itmadv', 33534, null, null, 'https://liquipedia.net/valorant/Madv'),
  (159, null, null, null, null, 'https://www.tiktok.com/@dannytopassyto', 1202, 'https://x.com/DANNYTO_vlr', 1057, null, null, null, null, null, null, null, null, 'https://liquipedia.net/valorant/DANNYTO'),
  (176, null, null, 'https://www.youtube.com/@CarotCrossfire', 13, null, null, null, null, 'https://www.facebook.com/nguyen.trung.khang.1409/', 3900, null, null, null, null, null, null, 'https://liquipedia.net/crossfire/Carot'),
  (177, 'https://www.instagram.com/teamfalconsgg/', null, null, null, null, null, 'https://x.com/FalconsEsport', null, 'https://www.facebook.com/wolfempirecf/', null, null, null, null, null, null, null, 'https://liquipedia.net/crossfire/Danxy'),
  (178, null, null, 'https://www.youtube.com/@LDX-ESPORTS', 12, 'https://www.tiktok.com/@dotkichvtconline', 57300, null, null, 'https://www.facebook.com/teamfalcongg/', 25000, null, null, null, null, null, null, 'https://liquipedia.net/crossfire/LDX'),
  (179, null, null, 'https://www.youtube.com/@dolacf3266', 4270, 'https://www.tiktok.com/@dolacrossfire', 2820, null, null, 'https://www.facebook.com/DOLACROSSFIRE', 8800, null, null, null, null, null, null, 'https://liquipedia.net/crossfire/Dola'),
  (4, null, null, 'https://www.youtube.com/@AbuGhaziGaming', 3120000, 'https://www.tiktok.com/@abughazi_gaming', 784600, 'https://x.com/xAbuGhazi', 9514, 'https://www.facebook.com/AbuGhaziGaming93/', 1500000, null, null, 'https://www.twitch.tv/aboghazi1', 108, 'https://kick.com/AbuGhazi', 94700, null)
)
update public.players p set
  instagram        = coalesce(d.instagram,        p.instagram),
  followers_ig     = coalesce(d.followers_ig,     p.followers_ig),
  youtube          = coalesce(d.youtube,          p.youtube),
  followers_yt     = coalesce(d.followers_yt,     p.followers_yt),
  tiktok           = coalesce(d.tiktok,           p.tiktok),
  followers_tiktok = coalesce(d.followers_tiktok, p.followers_tiktok),
  x_handle         = coalesce(d.x_handle,         p.x_handle),
  followers_x      = coalesce(d.followers_x,      p.followers_x),
  facebook         = coalesce(d.facebook,         p.facebook),
  followers_fb     = coalesce(d.followers_fb,     p.followers_fb),
  snapchat         = coalesce(d.snapchat,         p.snapchat),
  followers_snap   = coalesce(d.followers_snap,   p.followers_snap),
  twitch           = coalesce(d.twitch,           p.twitch),
  followers_twitch = coalesce(d.followers_twitch, p.followers_twitch),
  kick             = coalesce(d.kick,             p.kick),
  followers_kick   = coalesce(d.followers_kick,   p.followers_kick),
  liquipedia_url   = coalesce(d.liquipedia_url,   p.liquipedia_url),
  followers_data_updated_at = now(),
  updated_at = now()
from d where d.id = p.id;

-- ─── Manual override: Moaz's Snapchat = 57k (CSV missing value) ──────────
update public.players
   set followers_snap = 57000,
       updated_at = now()
 where id = 7;  -- Moaz

-- ─── Audit log entry ──────────────────────────────────────────────────────
insert into public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff)
select 'koge@migration_046', 'system', 'dossier_ingest_falcons_extreme', 'player', p.id::text,
       jsonb_build_object(
         'old_followers_ig', s.followers_ig,    'new_followers_ig', p.followers_ig,
         'old_followers_yt', s.followers_yt,    'new_followers_yt', p.followers_yt,
         'old_followers_tt', s.followers_tiktok,'new_followers_tt', p.followers_tiktok,
         'old_followers_x',  s.followers_x,     'new_followers_x',  p.followers_x,
         'old_followers_twitch', s.followers_twitch, 'new_followers_twitch', p.followers_twitch,
         'old_followers_kick',   s.followers_kick,   'new_followers_kick',   p.followers_kick,
         'note', 'Falcons Extreme Roster Dossier ingest')
  from public.players p
  join public._players_dossier_snapshot_pre_046 s on s.id = p.id
 where coalesce(p.followers_ig,0)     != coalesce(s.followers_ig,0)
    or coalesce(p.followers_yt,0)     != coalesce(s.followers_yt,0)
    or coalesce(p.followers_tiktok,0) != coalesce(s.followers_tiktok,0)
    or coalesce(p.followers_x,0)      != coalesce(s.followers_x,0)
    or coalesce(p.followers_twitch,0) != coalesce(s.followers_twitch,0)
    or coalesce(p.followers_kick,0)   != coalesce(s.followers_kick,0)
    or coalesce(p.followers_snap,0)   != coalesce(s.followers_snap,0)
    or coalesce(p.followers_fb,0)     != coalesce(s.followers_fb,0);