# Diablo 4 Gameplay Loop — Research Notes

> Compiled 2026-05-14. Reflects D4 through Season 13 / Vessel of Hatred / Lord of Hatred (level cap 70).
> The state of the game has shifted significantly since the 2023 launch — most pre-S4 commentary
> about loot and itemization is now obsolete.

## TL;DR

- D4's core loop at every zoom level is the ARPG fundamental: **kill → loot → upgrade → kill harder**. Each enemy kill is a pull of the slot-machine lever; randomness + variable rewards drive the dopamine response. Rod Fergusson has openly cited Skinner's variable-reward research as a design input.
- **Moment-to-moment** is a ~3-second cycle of "approach a mob pack, spend resource on AoE skills to delete it, watch loot beams pop, keep moving." Every class has a generator/spender/cooldown/ultimate cadence; combat is realtime, twin-stick-style movement with telegraph-based dodging.
- **Encounter loop** chains trash → elites → events → mini-bosses → chest. The chase is for elite packs (they drop more) and for chests/objectives that gate the bigger drops.
- **Session loop** is structured by event timers: Helltides (every hour-ish), World Bosses (every ~3.5h), Legion Events (every 25 min), and the player-built **War Plans** queue (S13). The player is constantly nudged to switch activities so nothing feels stale.
- **Progression loop**: Vessel of Hatred (Oct 2024) reset the level cap to 60, then Lord of Hatred (Apr 2026) raised it to 70. After cap, you push **Paragon** (300 points, account-wide), level **Glyphs** in the Pit (1-100), and grind gear (Tempering, Masterworking, Greater Affixes).
- **Itemization** was rebuilt in Season 4 ("Loot Reborn"): fewer affixes per item (3 on Legendary, 2 on Rare), each more impactful; **Tempering** adds a guaranteed build-defining affix; **Masterworking** upgrades all affixes with periodic crits. The Codex of Power decouples Legendary aspects from the items themselves.
- **Seasons** last ~3 months. New characters required (eternal characters carry over but most players reroll). Each season layers a new mechanic + battle pass + season journey + new uniques on top of the base game.
- **Loop quality** depends on: mob density, drop cadence, audio/visual feedback per rarity tier, build-defining drops that create immediate "now I can try X" moments, and chain-able activities that prevent menu friction.
- **Community criticisms**: seasonal reset fatigue, endgame depth still considered shallow vs. PoE/Last Epoch, season-to-season balance whiplash, mob density inconsistency, and ongoing complaints that the gear treadmill loses momentum once a build is "complete."

---

## 1. Moment-to-moment loop (≈ 3-30 seconds)

Diablo 4 is realtime, top-down-isometric, and built on what designers call the **"Fight, Loot, Level"** triad. The player is almost never standing still. The atomic unit of gameplay is the **pack clear**: locate a group of monsters, position, drop AoE, collect drops, move on.

**Inputs per second** (a typical built character at Torment difficulty):
- Constant movement input (WASD or stick) — D4 is a kiting game; standing still gets you killed in higher Torment.
- 1-2 basic attacks (resource generators) per ~second when low on resource.
- 2-4 core / spender abilities cast across a ~5s window when resource is full.
- 1-2 cooldown defensive skills (movement, dodge, barrier) per encounter.
- 1 ultimate every 30s-90s depending on cooldown reduction stats.
- Almost continuous loot stream — items rain at the player's feet with rarity-colored beams.

**Resource economies by class** — all single-resource except Warlock:
- Barbarian: **Fury**. Builds via basic attacks (Bash, Flay), spent on core skills (Whirlwind, Hammer of the Ancients).
- Sorcerer: **Mana**. Generators (Spark, Frost Bolt, Fire Bolt), spenders (Fireball, Chain Lightning, Blizzard).
- Druid: **Spirit**. Hybrid melee/ranged with shapeshifting (Werewolf, Werebear).
- Necromancer: **Essence**. Plus **Book of the Dead** sub-system for minion configuration.
- Rogue: **Energy**. Switches between melee and ranged weapons mid-combo.
- Spiritborn (VoH): **Vigor** + **Spirit Hall** dual-spirit guardian system; class is dash-heavy and mobile.

**The micro-rhythm Blizzard designs around**: Every action either generates resource, spends it, or buys time on cooldown. Skill rotations and cooldown management produce a continuous decision loop. Idle frames are punished — even white-tier mobs apply chip damage if you stop moving.

**Feedback and "juice"** — Blizzard is reported to have used fMRI to tune audio cues for loot drops; visual+audio stimuli have measurable effects on session length (players stay ~40% longer following a major drop, per dualmedia.com). Components:
- **Rarity-coded loot beams**: white < blue (Magic) < yellow (Rare) < orange (Legendary) < gold-ish (Unique) < red-edged (Mythic Unique).
- **Distinct drop sounds** per rarity, per item slot (weapon vs. armor vs. jewelry). Pavlovian conditioning — the orange-clang sound triggers reward anticipation independent of the visual.
- **Screen shake** on big hits / on Legendary drops (toggleable).
- **Number-popping damage**: white for normal, yellow for crit, orange for overpower crits.
- **Hit-stop / brief slowdown** on heavy skills like Hammer of the Ancients.
- Color-coded enemy health bars (white normal, blue elite, gold champion, etc.).

**Death feedback**: pre-death warning sound when health drops below ~30%; potion auto-targeted on low life. Death itself is mostly cheap — you respawn nearby, durability hit on gear, no XP loss outside of Hardcore mode.

**Pickup behavior**: gold auto-vacuums on proximity; potions auto-vacuum on Helltides/dungeons; items require manual pickup but a "loot filter" hides irrelevant rarity tiers below a threshold the player sets (introduced in S4, refined in later seasons). The loot filter is widely cited as a major quality-of-life improvement — players stopped picking up white/blue items by mid-game.

## 2. Encounter loop (≈ 1-5 minutes)

The world is structured as discrete combat encounters chained by short traversal:

1. **Trash packs** — ~5-15 weak monsters. Cleared in 1-3 casts. Drops mostly gold, materials, occasional rares.
2. **Elite packs** — a yellow or champion-tier mob plus minions, with affix modifiers (Frozen, Vampiric, Cold Enchanted, etc. — same pattern as D2/D3). These are the actual "loot fountain" — elites have a much higher legendary drop rate than trash.
3. **Sub-bosses / event bosses** — found at the end of cellars (1-room mini-dungeons), at the climax of world events, or as the guaranteed final fight in a dungeon. Higher loot, often guaranteed rare-or-better.
4. **World Bosses** (Ashava, Avarice, Wandering Death, Lord Zir, Beast in the Ice) — large mechanics-heavy fights on a ~3.5-hour rotating schedule. Group content; require positioning and avoiding telegraphed attacks. Drop unique mount armor + Legendary/Ancestral items.
5. **Lair Bosses / Uber Bosses** — endgame summon-only bosses (Duriel, Andariel, Lord Zir, Grigoire, Beast in the Ice, Echo of Varshan, Echo of Lilith). Require crafted summoning materials (e.g., 2 Mucus-Slick Eggs + 2 Shards of Agony for Duriel; reworked in S8 so summons are free, but the loot chest requires shards). These are the primary source of Mythic Uniques. Echo of Lilith is the capstone fight, the "Uber Uber" of the game.

**Encounter types and how they chain**:

- **Cellars** — 30-second mini-dungeons scattered across the open world. One room, one elite, one chest. Bite-sized.
- **Dungeons** — ~5-10 minute runs with a 2-3 objective structure (collect 3 items / kill 50 enemies / activate 2 statues, then kill the boss). Reward an Aspect imprint into the Codex on first completion. After campaign, become **Nightmare Dungeons** when run with a Nightmare Sigil — tiered difficulty, primary glyph XP source.
- **Helltides** — large open-world events that take over one zone for ~1 hour. Monsters drop **Aberrant Cinders** (timed currency — lost on death and on Helltide end). Cinders open **Tortured Gift chests** that can be slot-targeted (helm, chest, gloves, etc.) — directed farming. Helltide also has **Helltide Commanders** that drop reagents for summoning Uber bosses.
- **Whispers / Tree of Whispers** — a rotating list of bounties (kill X, complete a dungeon, finish an event). Each completion = 1-5 **Grim Favors**. 10 Grim Favors = a turn-in at the Tree for a gear cache. The cache is slot-selectable. This is the **bounty / gear-cache loop** — equivalent to D3's bounty system.
- **Legion Events** — Big public events every **25 minutes**. Group fight against waves culminating in a guaranteed rare-or-better drop and a Greater Reward chest.
- **The Pit (of Artificers)** — endgame timed dungeon. Pick a tier, get 15 minutes to clear it. Higher tiers gate Torment unlocks (Pit 10 → Torment 1, Pit 25 → Torment 2, etc.). Primary source of **Masterworking materials** and **Glyph XP**.
- **Undercity** (added VoH) — timed wave-based instance in Kurast Undercity. Drops are influenced by "Tributes" you slot before entering, allowing targeted farming.
- **War Plans** (added Lord of Hatred, S13) — player-built playlist of 5 endgame activities. Drops a structured progression curve through Helltides, Nightmare Dungeons, Pit, Lair Bosses, Undercity, and Tree of Whispers. Each activity rewards Activity Points that improve subsequent runs on that activity. This is the new endgame skeleton.

**Pacing principle**: The game pulls you between activities. Helltide is running for 1 hour → do Helltide. World Boss in 10 minutes → drop Helltide to fight it. Done with World Boss → Legion is up → fight Legion. The structure encourages variety even though all activities reduce to "kill stuff in different wrappers."

## 3. Session loop (≈ 1-2 hours)

A typical endgame session looks like:

1. **Login routine**: collect mailed items, check season journey progress, check active event timers.
2. **Open with a free Helltide** if active (or jump to Whispers map). Helltides give the best gold + targeted gear + ember-of-event spawns.
3. **Fold World Boss / Legion** into the Helltide path when their timer hits.
4. **After Helltide ends**, turn in Whispers at the Tree (10 Grim Favors → cache).
5. **Move to chosen progression activity** — typically a Nightmare Dungeon for Glyph XP, or The Pit for Masterworking mats, or summon a Lair Boss if you have the materials.
6. **Spend materials at town** — Temper new gear at the Blacksmith, Masterwork at the Pit's vendor, imprint Aspects at the Occultist, salvage trash, vendor anything not worth salvaging.
7. **Repeat the activity cycle** for the rest of the session, often gated by inventory fullness rather than by content exhaustion.

In Season 13, **War Plans** explicitly formalize this — you build a queue of activities and the game stitches them together with shared progression rewards, making the session feel "directed" rather than "random."

The session has a clear "off-ramp": the **Tree of Whispers cache** and the **end-of-Helltide chest** both feel like natural session-end moments. Blizzard threads these so the player gets a closure-feeling reward roughly every 30-60 minutes.

## 4. Progression loop

### 4.1 Campaign (1-50 → 1-60 post-VoH)

- **Levels 1-50** historically followed the main campaign questline (~25-35 hours).
- Post Vessel of Hatred (Oct 2024), the level cap was reduced from 100 → 60, and the entire 50-100 grind was condensed and re-weighted. Existing 100s were renormalized to 50.
- **Lord of Hatred** (Apr 2026) bumped the cap to 70.
- Campaign skip is available after first playthrough; most seasonal players skip campaign and rush to endgame.
- Skill points accumulate at fixed level thresholds; Renown rewards (Altars of Lilith — permanent stat boosts scattered across the world, plus side quest / dungeon discovery rewards) carry forward across characters on the same realm.
- Aspects unlock as you complete dungeons for the first time — each dungeon's first clear adds one Aspect to the Codex of Power.

### 4.2 Endgame & Paragon

- **Paragon Points are no longer level-gated** post-VoH. You hit cap, then continue earning Paragon Points up to 300.
- Paragon Points are now **realm-shared** across characters — alts inherit your Paragon progression.
- The Paragon system is a node-based board game: you have up to **5 boards** equipped (each ~21x21 grid of nodes), connected at their edges, with a **Glyph socket** on each board that radiates an area-of-effect bonus to nodes within its radius.
- **Glyphs**: pre-VoH max level was 21, now 100. Leveled by completing Pit runs above their current level (100% upgrade chance at +10 Pit tiers above Glyph level). Glyph radius grows at level 15 and again at level 50 (Legendary upgrade). Pushing a glyph to 100 multiplies build power significantly.
- Each Paragon board has a **Legendary Node** at the far edge — a multiplicative-class bonus that often dictates which boards you take and in what order. Board selection is build-defining.
- **Renown** (region completion) grants permanent skill points and Paragon points — incentivizes 100%ing the map at least once per realm.

### 4.3 Itemization (post Season 4 "Loot Reborn")

**Rarity tiers** (in ascending power):
- **Normal (white)** — base items, no affixes.
- **Magic (blue)** — 1 affix.
- **Rare (yellow)** — 2 affixes (post-S4; was more before).
- **Legendary (orange)** — 3 affixes + 1 Legendary Aspect slot.
- **Unique (gold)** — pre-set affixes with a special unique power. Build-defining.
- **Mythic Unique (red-orange)** — extremely rare uniques with 4 powerful affixes; build-defining at endgame. Often craftable from Resplendent Sparks.

**Tier modifiers** (independent of rarity):
- **Ancestral** items have higher item power and can roll **Greater Affixes**.
- Greater Affixes (introduced S4) are 1.5× more powerful versions of a roll. Items with 2-4 Greater Affixes are the chase pieces.

**Crafting / customization systems**:
- **Codex of Power** — account-wide Aspect library. Salvaging a Legendary teaches its Aspect at the salvage roll value (or upgrades the entry if higher). Aspects in the Codex can be imprinted onto any rare/Legendary at the Occultist. This decouples Legendary power from item rolls — the orange Aspect is the build-defining piece, the rest of the item is stats.
- **Tempering** (S4+) — add 1-2 guaranteed affixes to a non-Unique item using **Tempering Manuals** earned from the Codex of Tempering. Affixes are chosen from a category but rolled randomly within. Items have limited **Tempering Durability** (typically 5 rerolls); brick the item if you exhaust durability without the affix you want. This is the "deterministic-ish" crafting layer.
- **Masterworking** (S4+) — endgame upgrade system using materials from The Pit. 12 ranks. Every 4th rank "crits" and gives a massive bonus to one affix (blue, then yellow, then orange "triple-crit"). Players reset and re-roll Masterworking trying to land crits on key affixes.
- **Horadric Cube** (S13+) — affix-locking when re-rolling at the Occultist; protects desired affixes during reroll attempts.
- **Resplendent Sparks** — earned slowly from Uber bosses; combined to craft a Mythic Unique of choice. The deterministic chase.

**Affix design** (post-S4):
- Affixes are now simpler and more impactful — flat Max Life, +1 to skill, Movement Speed, Crit Damage, Vulnerable Damage rather than the old "+10% damage to non-injured Elites while wielding two-handed" conditionals.
- Damage stacks in **damage buckets / multipliers**: additive same-category bonuses (e.g., all Crit Damage% adds together into one bucket), then buckets multiply against each other. Build optimization is largely about finding sources from **different buckets** to compound multiplicatively rather than stacking additively within one bucket.

### 4.4 Difficulty tiers (World Tiers → Torment)

The system was overhauled in Vessel of Hatred and again in Season 13/Lord of Hatred:

- Old system (pre-VoH): **World Tier 1-4** (Adventurer, Veteran, Nightmare, Torment).
- VoH system: Normal → Hard → Expert → Penitent → **Torment 1-4**.
- Lord of Hatred (S13): expanded to **Torment 1-12** — 12 tiers instead of 4.
- Torment is gated by **Pit completion**, not by level or campaign:
  - Pit 10 → Torment 1
  - Pit 25 → Torment 2
  - Pit 40 → Torment 3
  - Pit 55 → Torment 4 (and onward for the new tiers)
- Each Torment tier is roughly +50% monster HP/damage, with better loot quality (more Legendaries, more chance for Greater Affixes, more Ancestral drops).
- Above some threshold, **Mythic Uniques** start dropping at meaningful rates.

The Pit-gates-Torment design is significant: you have to *demonstrate* power to unlock the next difficulty, rather than just check a level box. This filters out under-geared characters from over-tier content.

## 5. Seasonal loop

D4's season cycle is its long-term retention engine, modeled loosely on D3's seasons and Path of Exile's leagues.

**Season cadence**: ~3 months per season. Roughly **4 seasons per year**.

**What rotates**:
- A new **seasonal mechanic / theme** — e.g., Vampiric Powers (S2), Construct companions (S3), Loot Reborn rework (S4 — actually permanent), Infernal Hordes (S5), spirit-themed mechanics, etc.
- A new **Battle Pass** (Free + Premium track) — cosmetics, Smoldering Ashes (a season-only currency for XP boosts and gold/material bonuses), Platinum (premium currency).
- A new **Season Journey** — a structured set of objective chapters; completing each chapter rewards Favor (battle pass XP), cosmetics, and capstone rewards.
- A small number of **new Uniques and Legendaries** added to the loot pool. Some seasonal-exclusive uniques only drop during the season.
- Class balance patches.
- New side activities or zone modifications.

**Eternal Realm vs. Seasonal Realm**:
- Most players play **seasonal** because that's where the new content lives.
- Characters made in a season transition to the **Eternal Realm** at season end. Eternal exists as long-term storage / permanent home.
- Most players reroll each season because (a) seasonal mechanic only works on seasonal characters, (b) the leveling curve is a beloved part of the game, (c) the meta shifts so a fresh start with current balance feels fresh.

**Why players reroll**: the seasonal mechanic creates a temporarily-broken / temporarily-fun build paradigm (e.g., the Spiritborn at VoH launch was famously busted), and the journey from level 1 to "I can melt Torment 4" is the most density-of-progression-per-hour the game offers. The endgame plateau is where retention drops; the season reset re-injects steepness.

**Criticism of the season model**:
- New / casual players hate the reset. Many friends-of-friends bounce off when they realize their characters get "shelved."
- Some seasons (S12, S13) have been criticized for being light on truly new mechanics — Season of Reckoning notably had no new gameplay mechanic, just balance changes plus expansion-launch fanfare.
- Battle pass fatigue is real — by ~level 60 of the pass, rewards thin out.
- The "play wide vs. deep" tension: each season you either go wide (try a new class / new build with each season) or deep (push paragon 300 and Pit 150 in one season). Players who go deep often skip the next season; players who go wide may resent that their endgame investments don't stack across seasons.

## 6. What makes the loop feel good (design principles)

1. **Variable-ratio reinforcement** — drop rates are tuned to be rare enough that each drop feels earned, but frequent enough that ~every 5-15 minutes you get a recognizably "good" drop. This is straight Skinner-box psychology, openly acknowledged by Blizzard.
2. **Multiple parallel progression bars** — character XP, Paragon XP, Glyph XP, Renown, Battle Pass, Season Journey, Codex Aspect upgrades, Tempering manuals, Masterworking ranks. You're never "between rewards" — one bar is always near filling.
3. **Build-defining drops** — a single Unique or Aspect can pivot your entire playstyle. The first time a build-defining unique drops, players often log in just to try it. This is the **"now I can do X"** moment that's the actual hook.
4. **Density + AoE = power fantasy** — the screen-clearing fantasy works when there are enough enemies to clear. Blizzard has tuned density upward repeatedly since launch (S1, S4). Builds that delete the screen are the most popular in metas.
5. **Audio cohesion** — distinct loot sounds, distinct skill sounds, distinct enemy death sounds. The aural texture is dense — you can almost play with eyes closed and know what just dropped.
6. **Telegraphed danger** — elite affixes draw highlighted ground patterns; boss attacks have wind-up animations and ground markers. This means high-difficulty content is *learnable* rather than RNG.
7. **Frictionless inventory** — auto-vacuum gold, auto-sort, gear comparison tooltips on hover, salvage-all-trash button at the Blacksmith, item filter to hide low-rarity drops. Reducing tedium between fights keeps the loop tight.
8. **Closure beats** — Tree of Whispers cache, Helltide chest, Pit completion screen, dungeon boss chest, Tortured Gift opening — each is a discrete "you got rewarded" moment with its own animation/audio.
9. **Stake escalation** — Hardcore mode (permadeath); Pit/Nightmare Dungeon timers that fail the run if missed; Helltide cinders lost on death. Optional risk layers for players who want them.
10. **Player-built routes (War Plans)** — letting the player schedule their next 5 activities turns rote farming into a planned routine, with the bonus of stacked Activity Point rewards. This is the most successful endgame-loop addition since Season 4.

## 7. Criticism & evolution across seasons

**Launch (June 2023)** — Loop criticized as shallow. Itemization was bloated with conditional affixes; salvaging Legendaries felt mandatory but tedious; Nightmare Dungeons were the only endgame; XP-grind to 100 was glacial. Reviews praised atmosphere, criticized depth.

**Season 1 — Malignant** (Jul 2023). Added Malignant Hearts (slot-able powers). XP nerfs at launch were extremely unpopular ("the patch where they killed leveling"). Mob density was a major complaint that Blizzard then increased mid-season.

**Season 2 — Blood** (Oct 2023). Added Vampiric Powers, Lair Bosses, Tormented bosses, Bloodfever zones. First widely-praised season; gear upgrade system added.

**Season 3 — Construct** (Jan 2024). Vault dungeons and pet Seneschal Construct. Mixed reception; mechanic seen as boring by some.

**Season 4 — Loot Reborn** (May 2024). The watershed. Itemization was rebuilt:
- Fewer affixes per item, all more impactful.
- Tempering and Masterworking added.
- Helltide reworked to be the primary leveling/gearing zone.
- Greater Affixes added.
- Codex of Power restructured so saved Aspects could be upgraded.
- Most quality-of-life "this is the version of the game it should have shipped as" comments date from S4.

**Season 5 — Infernal Hordes** (Aug 2024). Added the Infernal Hordes wave-defense mode. Mythic Uniques were renamed from "Uber Uniques" and given more presence.

**Vessel of Hatred expansion** (Oct 2024). Full paid expansion. New zone (Nahantu), Spiritborn class, level cap reset 100→60, Paragon decoupled from level, Mercenaries returned (4 hireable companions with their own skill trees), Runewords system added, Undercity activity added.

**Seasons 6-12** — incremental theme rotations (Witchcraft, Mothers' Blessings, etc.), generally smaller scope. Community sentiment fluctuated; complaints about season "thinness" became frequent.

**Lord of Hatred expansion** (Apr 2026). Second paid expansion (this is current). Level cap 60 → 70. Torment tiers expanded from 4 → 12. War Plans system added. War Table for activity chaining. Skill tree changes across all classes; 200+ aspects reworked.

**Season 13 — Reckoning** (mid-2026, current). New classes, War Plans, but explicitly *no new seasonal mechanic* — controversial choice. Sentiment is "the systems are great, the seasonal content is light."

**Persistent criticisms**:
- **Endgame depth still trails PoE/Last Epoch** in build complexity and crafting determinism. D4's crafting is more "casino reroll" than PoE-style currency-driven crafting.
- **Mob density inconsistency** — different activities have wildly different density. The Pit in particular has been criticized for sparse maps.
- **Seasonal reset friction** for casual / returning players.
- **Trade is restricted** (Unique and Ancestral items are bind-on-pickup; only some affix categories can be traded) — players who like the PoE economic game find D4 sterile.
- **Build diversity** is real but narrows at the high end — every season has 2-3 dominant builds per class.

**Comparisons** (synthesizing community sentiment):
- **vs. Diablo 2**: D2 had deeper itemization, runeword crafting, longer XP grind, more brutal punishment. D4 is more accessible but less "sacred."
- **vs. Diablo 3**: D3's loop was more streamlined ("bounties → rifts → Greater Rifts"); D4 is more open-world but the activity types are conceptually similar.
- **vs. Path of Exile**: PoE has vastly more build/itemization depth and a player-driven economy, but its loot is much stingier and its complexity is a barrier. The PC Gamer line: "PoE2 can't match the dopamine hit of a good D4 drop" — D4 wins on instant gratification.
- **vs. Last Epoch**: Last Epoch has better crafting determinism and a beloved loot filter; D4 has more polish and content volume. Last Epoch is described in multiple reviews as "what D4 should have been at launch."

## 8. Sources

- Blizzard official: https://diablo4.blizzard.com/en-us/season ; https://news.blizzard.com/en-gb/diablo4/24077223/galvanize-your-legend-in-season-4-loot-reborn
- Maxroll: https://maxroll.gg/d4/resources/season-of-loot-reborn-guide ; https://maxroll.gg/d4/resources/paragon-boards ; https://maxroll.gg/d4/resources/difficulty-overview ; https://maxroll.gg/d4/resources/helltide-guide ; https://maxroll.gg/d4/resources/war-plans ; https://maxroll.gg/d4/resources/in-depth-damage-guide
- Icy Veins: https://www.icy-veins.com/d4/guides/helltide-guide/ ; https://www.icy-veins.com/d4/guides/paragon-glyph-guide/ ; https://www.icy-veins.com/d4/guides/legendary-aspects-codex-of-power-guide/
- Wowhead: https://www.wowhead.com/diablo-4/guide/gameplay/difficulty-torment-levels ; https://www.wowhead.com/diablo-4/guide/gameplay/codex-of-power-legendary-aspects ; https://www.wowhead.com/diablo-4/guide/end-game-overview-endgame
- PureDiablo: https://www.purediablo.com/diablo4/Damage_Buckets ; https://www.purediablo.com/diablo4/Duriel
- FextraLife wiki: https://diablo4.wiki.fextralife.com/ (multiple pages)
- DualMedia (psychology of loot): https://www.dualmedia.com/the-psychology-of-the-loot-system-in-diablo-4/
- Psychology of Games (Diablo III loot dopamine): https://www.psychologyofgames.com/2012/06/the-psychology-of-diablo-iii-loot-part-3-dopamine-binds-on-pickup/
- PC Gamer (Last Epoch comparison): https://www.pcgamer.com/last-epoch-is-everything-i-wished-diablo-4-was-and-the-first-arpg-to-drag-me-away-from-path-of-exile-in-over-a-decade/
- The Gamer (Last Epoch vs D4): https://www.thegamer.com/last-epoch-vs-diablo-4-comparison-which-is-better/
- Game Developer Essentials (gameplay loop theory): https://gamedevessentials.com/designing-an-engaging-gameplay-loop-the-ultimate-guide/
- Wikipedia: https://en.wikipedia.org/wiki/Diablo_IV:_Vessel_of_Hatred
- Various 2026 reviews of Lord of Hatred (Checkpoint, IGN-aggregated, Invision)

---

# Implications for the chupacabra project

> The current codebase is a movement-and-collision sandbox built on `WorldGame.ts` (10000×5000 px world,
> joystick movement, AABB/circle collision) with two platform-specific renderers
> (`WorldCanvas.tsx` native / `WorldCanvas.web.tsx` web). There is **no combat, no enemies, no inventory,
> no progression, no quests**. Below is a phased plan to grow this into something with a D4-shaped loop.

## Minimum viable Diablo-loop in this codebase

The smallest set of additions that produce a recognizable "kill → loot → upgrade → kill harder" loop, in dependency order:

1. **Enemies as moving entities** — extend `WorldGame.ts` to include an `enemies: Enemy[]` array with position, velocity, HP, damage, attack range. Reuse the existing AABB/circle collision against the static obstacles so enemies can't path through walls; for now they can use simple "move toward player if within aggro range" steering. Render them in **both** `WorldCanvas.tsx` (a `<View>` per enemy in the camera transform, viewport-culled exactly like the trees/rocks today) and `WorldCanvas.web.tsx` (drawn per-frame on the same canvas as the player).
2. **Player attack** — add a "primary attack" button on `ControlPanel` (tap or hold). The simplest first attack is an instant-cast AoE circle around the player, doing damage to any enemy whose distance is below a radius. Render it as a transient circle for ~150ms.
3. **HP, death, respawn** — give the player an HP value on `WorldGame`, deplete it when an enemy is within attack range and on its own attack cooldown, show it in a hud. On death, respawn at a fixed point (e.g., world center / nearest town).
4. **Loot drops** — when an enemy dies, spawn a "loot item" in the world (just a colored marker for now). Walk over to pick up. Add an inventory ref on `WorldGame`. This single feature triggers the dopamine loop; without it, you're just a fighting sandbox.
5. **Stat-affecting items** — gear with one stat (e.g., +damage, +HP, +move speed). Equipping changes player stats. Now there's a reason to pick things up.
6. **Difficulty pressure** — increase enemy density / HP / damage in zones far from origin; reward higher tier loot accordingly. This is the cheapest version of D4's "different zones = different difficulty."

That's it. Six steps from "movement sandbox" to "recognizable ARPG loop." Steps 1-3 are ~one focused session of work; steps 4-6 are the foundation of all subsequent phases.

## Phased requirements

### Phase 1 — Combat foundation

**Goal**: Make killing things possible and satisfying.

| Feature | Touches | Unlocks |
|---|---|---|
| `Enemy` class with HP, pos, vel, aggro radius, attack cooldown | `src/game/Enemy.ts` (new), `WorldGame.ts` (spawning + tick) | Everything downstream |
| Enemy AI: "chase player when in aggro radius, attack when in range" | `Enemy.ts` | Encounters |
| Enemy spawning by zone | `WorldGame.ts` — add `ENEMY_SPAWNS` const arrays like the existing `TREES` / `ROCKS` arrays | Mob density tuning |
| Player primary attack — AoE circle, instant, 0.4s cooldown | `WorldGame.ts` (`attack()` method, attack state), `ControlPanel.tsx` (new button), both `WorldCanvas` files (render flash) | The verb of the game |
| Damage numbers as floating text | Both `WorldCanvas` files | Feedback / juice |
| Player HP, enemy HP, death + respawn | `WorldGame.ts`, HUD overlay (new `src/components/Hud.tsx`) | Stakes |
| Collision-aware enemy steering — don't let enemies walk through walls | `WorldGame.ts` — reuse `collidesAt` for enemy moves | Looks-correct combat |

**Design notes (platform-agnostic input)**:
- Touch is the lowest-bandwidth target and sets the ceiling on ability count. Plan on **1 primary attack button + 1 dodge/dash + 1 ultimate slot** in `ControlPanel`. Auto-targeting (nearest enemy in attack arc) is the resolved combat model — required, not optional.
- An **auto-attack toggle** (hold-to-engage, or a "combat mode" state) is the right answer for the lowest-bandwidth control modality, freeing the right thumb for movement on mobile. Mouse and gamepad players can still tap to attack explicitly.
- Mouse-and-keyboard (web) and gamepad (console) should not be afterthoughts — wire input adapters that map cursor click / right-trigger to the same `attack()` method on `WorldGame`. Don't fork combat code per platform; fork input mapping only.

### Phase 2 — Loot & inventory

**Goal**: Add the reward half of the loop.

| Feature | Touches | Unlocks |
|---|---|---|
| `Item` type and `LootDrop` entity (item + world position) | `src/game/Item.ts`, `WorldGame.ts` | Loot |
| Loot drops from enemies (chance roll on death) | `WorldGame.ts` | The dopamine loop |
| Pickup on player proximity (~30px) | `WorldGame.ts` | Inventory fills |
| Rarity tiers (Common, Magic, Rare, Legendary) with color-coded beams and distinct pickup sounds | Both `WorldCanvas` files (render the colored beam above each drop), `WorldGame.ts` (rarity roll), `src/sound/` (new — `expo-av` for native and HTMLAudio on web) | Pavlovian conditioning |
| Inventory screen — modal `<View>` with item grid | New `src/components/InventoryScreen.tsx` | Item management |
| Equipping items (weapon, armor, ring slots) | `WorldGame.ts` (`equipped: Record<Slot, Item \| null>`) | Stat changes |
| Affixes: simple flat stats first (+damage, +HP, +move speed) | `Item.ts` | Build-relevant choices |
| Salvage / vendor (delete unwanted items, get materials) | `InventoryScreen.tsx`, `WorldGame.ts` | Inventory management = not a chore |
| Loot filter — auto-hide drops below a chosen rarity | `WorldGame.ts` (filter state), renderers | Reduces clutter |

**Note on the existing world**: the `TOWNS` array in `WorldGame.ts` is the obvious place for **vendor NPCs**. Adding "interactable" entries to the towns gets you Inventory / Vendor / Stash / Skill Tree UI hooks for free.

### Phase 3 — Progression

**Goal**: Add reasons to keep playing past hour 1.

| Feature | Touches | Unlocks |
|---|---|---|
| XP and player level | `WorldGame.ts` (`xp`, `level`, `xpForNextLevel`) | The level-up ceremony |
| Skill points spent on a tree | `src/game/SkillTree.ts` (new), `src/components/SkillTreeScreen.tsx` (new) | Build variety |
| 2-3 unlockable skills (replace the single attack with: AoE, projectile, dash) | `WorldGame.ts` (`skills: Skill[]`), `ControlPanel.tsx` (slot the skill onto a button) | Class fantasy |
| Resource system (mana / fury) — generator-attack and spender-attack | `WorldGame.ts` | The micro-rhythm of D4 |
| Cooldowns on the strong abilities | `WorldGame.ts` (`skill.cooldownEndsAt`), HUD ring/grey-out | Strategic ability use |
| Damage formula with at least one multiplicative axis (e.g., crit chance + crit damage) | `WorldGame.ts` (`computeDamage()`) | Build-defining stat goals |
| Aspects / runes — slot-able "Legendary" powers (e.g., "Whirlwind hits twice", "Fireball pierces") | `Item.ts` (legendary aspect field), `WorldGame.ts` (apply aspect modifiers) | Build-defining drops |
| Map overlay shows quest objectives / waypoints | `MapOverlay.tsx` (already exists; extend) | Direction without hand-holding |
| Towns as **safe zones** (no enemy spawns within X radius) | `WorldGame.ts` enemy spawn logic | Catch-your-breath moments |

### Phase 4 — Scored endgame activities

**Goal**: Give a player who's "maxed out" a reason to keep playing — through scoreboards, not co-op.

Per the resolved scoreboard pivot, every endgame activity must produce a measurable score. The three named metrics map directly to three activity archetypes:

| Activity archetype | Score metric | D4 analog | Implementation notes |
|---|---|---|---|
| **Timed dungeon run** | Race time (lower = better) | Nightmare Dungeons | Procedural rooms-and-corridors. Repurpose the unused `MazeGenerator.ts` (left over from the Kotlin port — it's literally sitting there waiting) as the dungeon generator. Clock starts on entry, stops on boss kill. |
| **Survival arena** | Survival length (higher = better) | (no direct D4 analog — closer to Vampire Survivors / Last Epoch arena) | Bounded zone, escalating wave spawner, no escape until death. Score is wall-clock survival time. Cheapest activity to build given combat already exists. |
| **Full-clear run** | Fastest completion (lower = better) | Helltide / zone clear | Pre-defined zone, kill every spawned enemy. Score is wall-clock from entry to last-kill. |
| World bosses (shared) | Best damage / kill time | D4 world bosses | Optional bonus activity — large unique enemy + scoreboard for fastest kill on that boss. |
| Difficulty tiers | Multiplier on scores | World Tier / Torment | One global multiplier on enemy HP/damage *and* a score multiplier so harder tiers can outrank easy speedruns. Unlock tier N by clearing some score threshold on tier N-1. |
| Glyph-like sub-progression | Permanent passives | D4 Paragon glyphs | Earned from activity completions. An extra progression axis that lets a player chase a better time on a previous activity by getting stronger, not just better. |

**Scoreboard infrastructure**:
- Per-activity `bestScores` array stored in local persistence (`chupacabra:scores:<activity-id>`).
- Score record schema: `{ score, timestamp, characterId, build-snapshot, runSeed }`. Storing the seed lets a player share a deterministic re-run with another player ("beat my time on seed X").
- HUD on activity start: previous best, current run timer, delta if mid-record.
- A simple "Personal Bests" screen is the MVP. Global leaderboards wait for a backend.

**Tip**: the three activity archetypes (timed, survival, clear) cover all three metric types — you don't need more activity *types* to ship a complete endgame. You need many *instances* of each (different zones, layouts, seeds).

### Phase 5 — Global leaderboards & seasons

**Goal**: Long-tail engagement via shared scoreboards and time-bounded competition.

This is the hardest phase and probably the latest. Don't start until phases 1-4 are solid and you've decided the scoreboards have legs.

- **Backend for global leaderboards** — a Supabase / Firebase / minimal-Express service that accepts `(activityId, score, characterSnapshot, runSeed)` tuples and returns top-N. The persistence model still favors local-first ([[project-persistence-layer]]); the backend is *only* for the leaderboard surface. Authenticate with anonymous device-bound IDs first; real accounts later if needed.
- **Anti-cheat smoke test** — even a hobby leaderboard gets cheated. Store the run seed and a hash of input events; at minimum, reject scores that are mathematically impossible given the build. Don't sink time into client integrity until there are players to cheat.
- **Seasonal ladders** — every N weeks, archive current leaderboards and start fresh. Players who placed high get a cosmetic / title that persists on their character. This is the chupacabra analog of D4's seasonal reset — but on the *score axis*, not the character axis. Characters and gear persist; the competition resets.
- **Season journey (personal)** — a list of objectives ("complete a timed dungeon under 5min", "survive 10 minutes in an arena", "equip a Legendary") with rewards. Implement as a state machine of milestones in `WorldGame.ts`. Works fine before backends exist.
- **Seasonal mechanic** — one twist per season (e.g., "all enemies have a chance to drop a power-up coin you can equip"). Designed to be self-contained so it can be added/removed without breaking the base game.
- **Out of scope** (chupacabra is not D4): battle pass, paid cosmetics, trade, guilds.

## Resolved constraints (decided by the user)

These are not open questions — they are project constraints:

- **Platforms:** Chupacabra is **platform-agnostic**: Android, iOS, web, AND console. Input/UX must adapt per platform (touch joystick, mouse/keyboard, gamepad). Never design for one input modality only.
- **Visual style:** The game view IS the **Diablo 4 minimap, expanded** to be the full camera view. Cartographic top-down: terrain outlines, paths/roads as lines, points of interest as glyphs, entities as dots/icons. The existing top-down renderer + `MapOverlay.tsx` aesthetic already matches this. No isometric pivot, no sprite pipeline — keep rendering geometric primitives in the minimap visual language. This resolves what would otherwise be the art-budget question: the "minimap look" is the art direction, not a placeholder for it.
- **Session length:** Target is **same as D4 (~1-2 hours) or shorter**. Combined with the multi-platform constraint, this means activities (dungeons, cellars, events, wave runs) must be self-contained and resolvable in 5-15 minutes so a short mobile session is satisfying — while still supporting longer chained sessions on desktop/console. Persistence saves mid-activity. Avoid pure-roguelike "lose everything on death" loops without meta-progression.
- **Combat model:** **Realtime with auto-targeting primary attack.** Player moves freely; primary attack auto-acquires the nearest valid enemy. No pause-on-cast, no VATS-style time-slow, no turn-based. Manual aim is a secondary affordance for mouse/gamepad players, not a requirement. Don't design abilities that *require* pixel-perfect aiming — touch input can't deliver that.
- **Persistence:** **Local per-device only** — `AsyncStorage` on native, `localStorage` on web, platform save APIs on console. No backend in scope. Data shapes must be JSON-serializable. Saves happen mid-session, not just at activity completion. Namespace keys (`chupacabra:player`, `chupacabra:scores:<activity>`).
- **Audio:** **Placeholders early, polish later.** Wire `expo-audio` in Phase 1 with CC0 placeholder SFX for hit, enemy death, loot-drop-by-rarity, level-up, low-health. Iterate sound design later; the dopamine wins from day-1 audio are too cheap to skip.
- **Social/competitive layer:** **Scoreboards, not multiplayer.** This is a deliberate divergence from D4's structure. The social hook is comparing scores on shared activities, not comparing gear/builds with friends. Named scoreboard metrics: **race time through an area**, **survival length**, **fastest completion**. Implications:
  - Every endgame activity must produce a measurable *score* — design with the measurement layer baked in, not bolted on.
  - Build/gear progression still exists, but it's the *means* to higher scores, not an end in itself. Closer in shape to Risk of Rain / Hades / speedrun communities than to ARPG endgame culture.
  - Local-only leaderboards (per-device) are a valid MVP given the local-persistence decision. A lightweight backend (Supabase/Firebase free tier) becomes worth standing up only once players want global comparison.
  - Activity types implied by the named metrics: timed dungeons (race time), wave-based survival arenas (survival length), full-clear runs (fastest completion). All three fit the 5-15 min mobile session bite.
  - Co-op, parties, shared world, and trade are explicitly OUT of scope.

