-- Add lightweight list markers to official Shiur Builder content.
-- This is non-destructive: it only reformats the display text for two seeded chunks.

update public.content_chunks
set content_markdown = $chunk$Although we passkinlike Shmuel, the בית יוסף (3) quotes a three-way dispute among the Rishonim on how to understand the words of the Gemara״דגים שעלו בקערה״, which Shmuel permitted, and the דרכי משהquotes a fourth opinion which contains elements of several of the opinions quoted in the בית יוסף.

1. ריב״ן - quoting his father-in-law, Rashi – Shmuel only allowed eating the fish with dairy when the hot fish was placed on a fleishig plate, but if the fish was cooked or fried in a fleishig pot/pan, it may not be eaten with dairy. He explains that when a hot piece of fish is placed on a cold fleishig plate, only a little bit of flavor is absorbed in the fish – up to a כדי קליפה.[1] However, when the fish is cooked or fried in a fleishig pot/pan, the fish completely absorbs the flavor of the meat and may not be eaten with dairy.

2. ספר התרומה, רא״ש וטור - Shmuel even allowed fish that was cooked in a fleishig pot because the meat flavor is weakened 3 times:from the meat to the pot, from the pot to the water, and from the water to the fish. However, fish that was fried in a pan may not be eaten with dairy because it was only weakened twice: From the meat to the pan and from the pan directly into the fish.

3. רמב״ם - Shmuel allows eating the fish with dairy even if it was fried in a fleishig pan because the meat flavor was weakened twice: from meat to the pan and from pan to the fish; the cheese was added only after.[2]

4. איסור והיתר (quoted by the דרכי משה) - le’chatchilla, if fish was either cooked or fried in a fleishig pot/pan, you should not eat it with dairy (like the ריב"ן), but if dairy was mistakenly added to it, it may be eaten, even if the fish was fried in afleishig pan (like the רמב״ם). Furthermore, everyone would agree that you are allowed to place hot fish that was cooked in a fleishig pot/pan on a dairy plate. Lastly, we are only machmirnot to eat fish cooked in a fleishig pot/pan with dairy if the pot/pan is ben-yomo (and the meat flavor is still strong). However, if the pot/pan is eino ben-yomo, the fish may be eaten with dairy le’chatchilla.

[^1]: As we learned last zman, that תתאה גבר cooks up until a כדי קליפה.
[^2]: The reason the Gemara relates of case of ״עלו בקערה״ and not the bigger chiddush of the food being cooked is because it was showing the chiddush of רב, that even if the fish was just placed on a fleishig plate it may not be eaten with dairy.$chunk$,
  updated_at = now()
where chunk_code = '95-B6';

update public.content_chunks
set content_markdown = $chunk$To summarize:

- Everyone agrees that if dairy was already added to parve food cooked in a ben-yomo pot or pan (after the food was removed from the pot), it may be eaten.

- Everyone agrees that dairy may be added to parve food cooked in an eino ben-yomo fleishig pot/pan.

- S”A – You may add dairy to parve food cooked in a ben-yomo fleishig pot (after the food was removed from pot).

- ש״ך – You may not cook parve food with intention to add dairy.

- Rav Ovadya – You may even cook it with intention to add dairy.

- Rama –You may not add dairy to parve food cooked in a ben-yomo pot, but if added it is permitted.

- Rama –Dairy may be added to parve food cooked in an eino ben-yomo fleishig pot/pan.

  o Gra – You may cook the parve food in eino ben-yomo pot with intention to later add dairy.

  o חכ״א –You may later add dairy only if parve food was already cooked in an eino ben-yomo pot, but if you have no other pots, you may rely on the Gra.

- According to the Rama, parve food cooked in a ben-yomo fleishig pot may be placed on a dairy plate.

- Hot parve food cooked in a parve pot and placed on a fleishig plate may be eaten later with dairy (Gemara above quoted by Rama).

| Case | Ben-Yomo: cooking parve with intention to eat with dairy | Ben-Yomo: already cooked parve and want to add dairy | Ben-Yomo: cooked parve and added dairy | Eino-Ben-Yomo: cooking parve with intention to eat with dairy | Eino-Ben-Yomo: already cooked parve and want to add dairy | Eino-Ben-Yomo: cooked parve and added dairy |
|---|---|---|---|---|---|---|
| S”A | Shach: forbidden. Rav Ovadya: permitted. | Permitted | Permitted | Permitted | Permitted | Permitted |
| Rama | Forbidden | Forbidden | Permitted | Gra: permitted. Chachmas Adam: forbidden. | Permitted | Permitted |$chunk$,
  updated_at = now()
where chunk_code = '95-B9';
