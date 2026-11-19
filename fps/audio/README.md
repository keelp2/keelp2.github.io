# Call of Doodie audio: drop-in clips

Everything in the game has a generated sound already. Any clip you add **replaces** that sound; anything you don't add keeps the generated version. So you can add clips a few at a time.

Only use audio you have the rights to: your own recordings, purchased packs, or CC0 / royalty-free libraries (for example Sonniss GDC bundles or CC0 sounds on Freesound).

## Music: `audio/music/`

Name the files exactly like this. There is no list to edit; the game detects them automatically.

| File | When it plays | Length / notes |
|---|---|---|
| `menu.mp3` | Main menu and lobbies (loops) | 2–4 min, should loop cleanly |
| `deploy.mp3` | Match start sting | 5–8 s |
| `victory.mp3` | You win | 10–15 s |
| `defeat.mp3` | You lose | 10–15 s |

## Sound effects: `audio/sfx/` + `manifest.json`

Put the clips in `audio/sfx/` and list them in `audio/sfx/manifest.json`. Give several takes per key for variety; the game picks one at random and slightly varies the pitch each time:

```json
{
  "gun_rifle": ["rifle_1.mp3", "rifle_2.mp3", "rifle_3.mp3"],
  "hm": ["hitmarker.mp3"],
  "step_concrete": ["step_c1.mp3", "step_c2.mp3", "step_c3.mp3", "step_c4.mp3"]
}
```

The game adds distance, direction (3D), muffling through walls, reverb and speed-of-sound delay itself. So record clips **close and fairly dry**: a short natural tail is fine, but no big echo baked in. Use mono or stereo MP3 at 44.1/48 kHz, peaking around -1 dB, with no silence at the start.

### Guns (most important)

If you only get a few, start with the **bold** ones; the others fall back to their nearest match.

| Key | Weapon(s) |
|---|---|
| **`gun_pistol`** | 9mm pistol (also covers the revolver) |
| **`gun_rifle`** | 5.56 carbine, tactical rifle, burst rifle, short carbine (also the bullpup) |
| **`gun_ak`** | 7.62 assault rifle, 6.8 heavy rifle (also battle rifle/GPMG) |
| **`gun_smg`** | 9mm SMGs, PDW, mini SMG (also .45 SMGs, machine pistol) |
| **`gun_lmg`** | 5.56 LMG |
| **`gun_shotgun`** | Pump, double barrel, slug (also the auto shotgun) |
| **`gun_sniper`** | Snipers (also marksman rifles, .50 cal) |
| `gun_revolver` | .357 revolver, .50 hand cannon, lever action |
| `gun_battle` | 7.62 battle rifle, GPMG, support gun, short carbine |
| `gun_bullpup` | 5.56 bullpup |
| `gun_hyper` | .45 hyper SMG, PDW, mini SMG |
| `gun_ump45` | .45 compact SMG |
| `gun_mpistol` | Machine pistol |
| `gun_autosg` | Auto shotgun |
| `gun_dmr` | Marksman rifles |
| `gun_fifty` | .50 anti-materiel rifle |
| `gun_suppressed` | Any gun with a suppressor |

Each clip should be one shot, roughly 0.4–1.5 s including the tail. Fast-firing guns sound best with a shorter tail.

### Weapon handling

| Key | Sound |
|---|---|
| `magout` / `magin` | Magazine out / in |
| `rack` | Charging handle back and forward |
| `bolt` | Sniper bolt cycle |
| `pump` | Shotgun pump |
| `shell` | Loading one shotgun shell |
| `empty` | Dry-fire click |
| `low` | Low-ammo tick |
| `switch` | Swapping weapons |
| `mtap` | Mag tap / small handling noise |

### Feedback (hit markers and so on)

| Key | Sound |
|---|---|
| `hm` | **Hit marker**: short, crisp tick (CoD-style). Ships as `hitmarker.wav`, loaded directly; headshot and kill markers reuse it (pitched up with a ping, or pitched down and doubled) |
| `hmhead` | Headshot hit marker (a little sharper and brighter) |
| `hmkill` | Kill-confirm marker (tick plus a body "thump") |
| `hmstun` | Hitting someone with a stun/concussion |
| `head` | Headshot "ding" layer |
| `kill` | Kill confirm layer |
| `hurt` | You take damage |
| `fallhurt` | Hard landing that hurts |
| `whiz` | Bullet flying past your head |
| `ric` | Ricochet off metal or concrete |
| `glass` | Window shattering |
| `board` | Wooden board breaking |

### Movement

| Key | Sound |
|---|---|
| `step_concrete`, `step_wood`, `step_metal`, `step_grass`, `step_sand`, `step_dirt`, `step_stone`, `step_water` | One footstep each, 4–6 takes per surface |
| `jump` | Jump effort / gear rattle |
| `land` | Landing |
| `slide` | Sliding |

### Melee

| Key | Sound |
|---|---|
| `swing` | Blade whoosh |
| `stab` | Knife hit (flesh) |
| `kslash` | Fast knife slash |
| `kwall` | Knife hitting a wall |
| `clang` | Frying pan hit |

### Grenades, explosions, abilities

| Key | Sound |
|---|---|
| `pin` | Grenade pin pull |
| `throw` | Throw whoosh |
| `bounce` | Grenade bouncing |
| `explosion` | Close explosion (grenade, barrel, rocket) |
| `explosion_far` | Distant explosion / artillery |
| `charge` | Ability charging up |
| `pad`, `wave`, `howl`, `brew` | Class abilities (dash, concussion blast, armour plates, gas canister) |

### UI and match

| Key | Sound |
|---|---|
| `cd` | Countdown beep (3, 2, 1) |
| `go` | Countdown "GO" |
| `tick` | Timer tick |
| `levelup` | Level up |
| `pickup` | Picking something up / UI confirm |
| `spawn` | Respawn |
| `clear` | Survival wave cleared |

### Ambience

| Key | Sound |
|---|---|
| `amb_wind` | A seamless wind loop, 20–60 s; plays quietly under every match |
