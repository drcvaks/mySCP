-- Import public review question bank for Weeks 8-12.
-- Generated from: C:\Users\Family\ws\mySCPcodex\mySCP_Weeks8_12_Question_Bank_REVISED.csv
-- Rows: 97
--
-- Run this in the Supabase SQL editor after the core schema/migrations are applied.
-- Recommended: run supabase/pilot_cleanup.sql first only if you are replacing all old pilot/test content.
-- If Weeks 1-7 are already imported and should stay, do not run pilot_cleanup.sql again.
--
-- Behavior:
-- - keeps users, profiles, chaburos, memberships, settings, and notification preferences
-- - replaces existing public-library review questions for Weeks 8-12 only
-- - leaves public-library review questions for Weeks 1-7 untouched
-- - inserts matching protected answer keys in public.review_question_answers
-- - uses the first public.profiles row with role = 'global_admin' as created_by

begin;

create temp table import_public_review_question_bank (
  id uuid primary key,
  week smallint not null,
  topic text not null,
  prompt text not null,
  kind public.review_question_kind not null,
  choices jsonb not null,
  correct_choice_index smallint not null,
  explanation text not null,
  is_model_question boolean not null
) on commit drop;

insert into import_public_review_question_bank (
  id,
  week,
  topic,
  prompt,
  kind,
  choices,
  correct_choice_index,
  explanation,
  is_model_question
)
values
  (gen_random_uuid(), 8, 'Yayin Nesech for the Sick', 'If a doctor says to use yayin nesech because this avodah zarah will heal the patient, it may not be used even for pikuach nefesh.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'When the healing is attributed to avodah zarah, the prohibition remains yehareg v''al ya''avor.', true),
  (gen_random_uuid(), 8, 'Yayin Nesech for the Sick', 'If a doctor simply says that a dangerously ill person needs wine, yayin nesech may be used when necessary.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The Shach allows it when the cure is not being attributed to avodah zarah.', true),
  (gen_random_uuid(), 8, 'Stam Yeinam for Medical Use', 'A dangerously ill person may drink stam yeinam if it is needed to save his life.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Stam yeinam is rabbinic and is overridden by pikuach nefesh.', true),
  (gen_random_uuid(), 8, 'Stam Yeinam for Medical Use', 'A person with a non-dangerous illness may drink stam yeinam for medical purposes.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Chazal did not allow consuming rabbinically forbidden food for a non-dangerous illness.', true),
  (gen_random_uuid(), 8, 'Stam Yeinam for Medical Use', 'The Rama allows bathing or anointing with stam yeinam for a sick person whose life is not in danger.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The Rama is lenient for anointing because sikhah k''shtiyah is rabbinic and was not applied to the sick.', true),
  (gen_random_uuid(), 8, 'Resveratrol', 'Resveratrol pills containing actual stam yeinam are permitted because swallowing a pill is never considered eating.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Swallowing a pill is not enough to permit consuming forbidden wine ingredients.', true),
  (gen_random_uuid(), 8, 'Resveratrol', 'Anti-aging resveratrol cream is automatically treated like medical treatment for a choleh.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Wrinkles are not treated as an illness for this leniency.', false),
  (gen_random_uuid(), 8, 'Grapeseed Oil', 'Grapeseed oil used for consumption still needs a hechsher for general kashrus concerns.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The stam yeinam concern may be removed, but keilim and additives still need supervision.', true),
  (gen_random_uuid(), 8, 'Stam Yeinam for Medical Use', 'A doctor recommends soaking a rash in red wine. Which answer best captures the machlokes?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Everyone permits bathing but forbids drinking', 'The S.A. forbids bathing; the Rama may permit it for a sick person', 'The Rama permits drinking but not bathing', 'Everyone forbids even in pikuach nefesh'), 1, 'The S.A. treats anointing like drinking, while the Rama is lenient for the sick.', false),
  (gen_random_uuid(), 8, 'Resveratrol', 'Why are resveratrol supplements with wine ingredients more problematic than many creams?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('They are always mevushal', 'They are made only by Jews', 'They are consumed, not just applied externally', 'They contain no grape material'), 2, 'Consumption of stam yeinam is more severe than external use, especially for vitamins or prevention.', true),
  (gen_random_uuid(), 8, 'Resveratrol', 'Why may many resveratrol creams be permitted even according to the stricter view?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Creams are always food', 'Creams are always made from kosher wine', 'Anything on the skin is automatically permitted', 'The resveratrol is often batel b''shishim'), 3, 'Many creams contain only a tiny percentage of resveratrol, which can be nullified.', false),
  (gen_random_uuid(), 8, 'Grapeseed Oil', 'Why is grapeseed oil not treated like ordinary grape seeds from stam yeinam?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The oil is viewed as a new product and remaining wine taste is eliminated', 'Grape seeds are never connected to wine', 'Oil is always kosher without supervision', 'Wine taste improves the oil'), 0, 'The production process transforms the seeds and removes or destroys wine residue.', true),
  (gen_random_uuid(), 8, 'Grapeseed Oil', 'For cosmetic use, what is the practical conclusion about pure grapeseed oil?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It is assur b''hanaah', 'It may be used without a hechsher for the stam yeinam concern', 'It is permitted only after twelve years', 'It is permitted only if mevushal'), 1, 'For external use, the stam yeinam concern is not considered a problem in today''s production.', false),
  (gen_random_uuid(), 8, 'Mevushal Wine', 'Jewish-owned mevushal wine was touched by a non-Jew. What is the basic halacha learned here?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It becomes forbidden to drink but not benefit', 'It becomes assur b''hanaah', 'It remains permitted', 'It is permitted only after six parts water'), 2, 'Mevushal wine is not treated like ordinary wine touched by a non-Jew.', true),
  (gen_random_uuid(), 8, 'Mevushal Wine', 'What is one central reason mevushal wine touched by a non-Jew is permitted?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It contains no grapes', 'It is always diluted six-to-one', 'It was already touched by a Jew', 'It would not be offered as libation'), 3, 'Mevushal wine is not the type of wine used for libation.', true),
  (gen_random_uuid(), 8, 'Mevushal Wine', 'A non-Jew owns a bottle of kosher mevushal wine and offers to pour it for you. Which issue makes this more complex?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Some distinguish Jewish-owned mevushal wine from mevushal stam yeinam', 'Mevushal wine is always worse than raw wine', 'Mevushal wine becomes meat after cooking', 'A non-Jew may never touch sealed wine'), 0, 'Some explanations permit Jewish-owned mevushal wine touched by a non-Jew but are stricter with wine owned by a non-Jew.', true),
  (gen_random_uuid(), 8, 'Mevushal Wine', 'Which description best defines wine becoming mevushal?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It is warmed to room temperature', 'It is heated enough that evaporation begins and the volume slightly decreases', 'It is mixed with honey', 'It is sealed with two seals'), 1, 'Mevushal requires meaningful heating, not just mild warming.', false),
  (gen_random_uuid(), 8, 'Pasteurized Wine', 'Why does RSZA question whether flash pasteurization counts as mevushal?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It is always done by non-Jews', 'It makes the wine stronger', 'It may not evaporate or change taste in the normal way', 'It adds honey and pepper'), 2, 'RSZA focuses on the lack of normal evaporation and taste change.', false),
  (gen_random_uuid(), 8, 'Pasteurized Wine', 'What is the practical halacha about pasteurized wine?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Everyone agrees it is not mevushal', 'Everyone agrees it is always mevushal', 'It is mevushal only if frozen first', 'There is a dispute whether it counts as mevushal'), 3, 'Rav Moshe and Rav Ovadya are lenient, while RSZA and Rav Elyashiv are stricter.', false),
  (gen_random_uuid(), 9, 'Wine Mixtures', 'Wine that already became forbidden before being mixed does not become permitted just because it is later mixed with other ingredients.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Once the wine is already assur, later mixing does not undo the prohibition.', true),
  (gen_random_uuid(), 9, 'Wine Mixtures', 'If Jewish-owned wine is mixed with ingredients that change its taste, it may remain permitted if a non-Jew later touches it.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'A changed wine mixture is no longer treated as regular wine for this gezeirah.', true),
  (gen_random_uuid(), 9, 'Wine Mixtures', 'Wine mixed into food and no longer discernible remains permitted if a non-Jew touches the food.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'When the wine is absorbed into the dish, the touch is not treated like touching wine.', true),
  (gen_random_uuid(), 9, 'Salad Dressing', 'If wine separates to the top of a dressing and its flavor did not change, a non-Jew touching that wine can prohibit it.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Visible, unchanged wine is still treated as wine.', true),
  (gen_random_uuid(), 9, 'Frozen Wine', 'Frozen wine touched by a non-Jew is permitted according to the Rama.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Congealed or frozen wine is not treated like ordinary liquid wine at the moment of touch.', true),
  (gen_random_uuid(), 9, 'Wine Mixtures', 'Wine touched by a non-Jew before it was added to chocolate becomes permitted once mixed into the chocolate.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Wine already prohibited remains prohibited even if mixed afterward.', false),
  (gen_random_uuid(), 9, 'Mevushal Mixtures', 'Non-mevushal wine mixed into mevushal wine can never be permitted if touched by a non-Jew.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The Rama discusses permitting when the mevushal wine is enough to nullify the non-mevushal wine.', false),
  (gen_random_uuid(), 9, 'Sherry Cask Concerns', 'Sherry cask whiskey raises no bitul question because barrels do not absorb wine.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The whole concern is the wine flavor absorbed in the barrel walls.', true),
  (gen_random_uuid(), 9, 'Wine Mixtures', 'What is the key reason wine mixed with honey and pepper may remain permitted after a non-Jew touches it?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The wine flavor changed', 'Honey is always mevushal', 'Pepper creates shishim', 'The non-Jew touched only a kli'), 0, 'Changing the taste removes the mixture from the normal wine gezeirah.', true),
  (gen_random_uuid(), 9, 'Wine Mixtures', 'A cake batter contains wine and a non-Jew touches the batter after it is fully mixed. What is the best answer?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It is assur b''hanaah', 'It is permitted', 'It is forbidden until baked', 'It is permitted only if the non-Jew is a child'), 1, 'The wine is mixed into food and its flavor is changed by the other ingredients.', false),
  (gen_random_uuid(), 9, 'Salad Dressing', 'A salad dressing contains wine that has separated and is visible on top. What factor could still permit it?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The dressing is cold', 'The bowl is glass', 'The wine flavor was changed by the other ingredients', 'The non-Jew used a spoon'), 2, 'Visible wine is a problem unless the taste has changed enough that it is not regular wine.', true),
  (gen_random_uuid(), 9, 'Frozen Wine', 'A non-Jew touched frozen wine cubes, and later they melted. What should be remembered?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The wine stays permitted forever even after new touching', 'The freezing makes it mevushal', 'The wine becomes assur b''hanaah immediately', 'The touch while frozen is permitted, but once melted it regains wine status for future touches'), 3, 'The leniency applies to the frozen state; melted wine is ordinary wine again.', false),
  (gen_random_uuid(), 9, 'Pottery Jugs', 'A pottery shard from a non-kosher winery absorbed stam yeinam and can release wine when soaked. May it be used to fix a wobbly bed?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('No, that is benefit from absorbed stam yeinam', 'Yes, because it is only a shard', 'Yes, because the wine is dry', 'Yes, if the bed is not used for eating'), 0, 'The absorbed wine can make even benefit from the pottery prohibited.', false),
  (gen_random_uuid(), 9, 'Mevushal Mixtures', 'Non-mevushal wine was mixed into mevushal wine and then touched by a non-Jew. What ratio is one basis for leniency?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('One part mevushal to one part non-mevushal', 'One part non-mevushal to six parts mevushal', 'Any drop of mevushal is enough', 'Only shishim against all wine'), 1, 'The Rama connects this to the one-to-six framework used for diluted wine.', true),
  (gen_random_uuid(), 9, 'Sherry Cask Concerns', 'According to the stricter concern of the Shach, what amount may be needed against absorbed wine in a sherry cask?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Only a drop of whiskey', 'A majority of bourbon barrels', 'Shishim against the thickness of the barrel walls', 'One part water'), 2, 'The Shach''s approach makes bitul much harder because the whole wall thickness may count.', true),
  (gen_random_uuid(), 9, 'Sherry Cask Concerns', 'Why is sherry flavor in whiskey harder to nullify than an accidental mixture?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It is always cold', 'It is always less than one percent', 'It is never tasted', 'It is intentionally used for flavor'), 3, 'A forbidden ingredient added for taste may not be batel even in very large amounts.', true),
  (gen_random_uuid(), 9, 'Sherry Cask Concerns', 'Why might even a one-to-six bitul approach fail in a first-fill sherry cask?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The wine is always mevushal', 'The barrel may not hold six times the absorbed wall volume', 'The whiskey is not sharp', 'The cask has no wood'), 1, 'If the entire wall thickness counts, there may not be enough whiskey for bitul.', false),
  (gen_random_uuid(), 9, 'Sherry Cask Concerns', 'A company chooses sherry casks specifically to darken the whiskey. Which rule creates a concern?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Dark liquids are always pareve', 'Color only matters for meat and milk', 'Ingredients added for color are not batel', 'Wine color disappears after 24 hours'), 2, 'Coloring agents can remain significant even when the amount is small.', false),
  (gen_random_uuid(), 9, 'Wine Mixtures', 'Which case is most clearly permitted after a non-Jew touches it?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Visible unchanged wine floating on dressing', 'Wine touched before entering chocolate', 'A shard that releases stam yeinam when soaked', 'Wine already blended into cake batter'), 3, 'Wine blended into food with changed taste is no longer treated as ordinary wine.', false),
  (gen_random_uuid(), 10, 'Sherry Cask Leniencies', 'Rav Moshe discusses wine added to whiskey and allows bitul in a ratio of one to six according to the S.A. and Taz.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'He treats stam yeinam in whiskey more leniently than a standard shishim case.', true),
  (gen_random_uuid(), 10, 'Second-Fill Casks', 'A second-fill sherry cask is generally more lenient than a first-fill sherry cask.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'After enough time and prior use, the original sherry flavor is much weaker or gone.', true),
  (gen_random_uuid(), 10, 'Second-Fill Casks', 'A label that proudly says first-fill sherry cask usually points to a stricter concern.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'First-fill means the cask more recently held sherry and has stronger absorbed wine flavor.', true),
  (gen_random_uuid(), 10, 'Sherry Flavor', 'According to Rav Moshe, any noticeable wine flavor is automatically too strong to be batel.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Rav Moshe allows weak flavor to be batel even if somewhat noticeable.', false),
  (gen_random_uuid(), 10, 'Coloring', 'The Minchas Yitzchak says the rule of color not being batel applies the same way to rabbinic prohibitions like stam yeinam.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'He limits that color concern to biblical prohibitions.', false),
  (gen_random_uuid(), 10, 'Bitul Lechatchilla', 'There is no room to be lenient with bitul lechatchilla when the product is made mainly for non-Jewish customers.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'One leniency is that the producer is not nullifying the issur for Jews.', false),
  (gen_random_uuid(), 10, 'Grappa and Brandy', 'Brandy is made by distilling wine or other fermented fruit juices.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Brandy concentrates the alcohol from wine or fruit wine through distillation.', true),
  (gen_random_uuid(), 10, 'Grappa and Brandy', 'Grappa and brandy made by non-Jews do not need a hechsher because distillation removes all wine issues.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The vapor or grape remains can keep the halachic status of the original wine material.', true),
  (gen_random_uuid(), 10, 'Second-Fill Casks', 'Why may a second-fill sherry cask be permitted even according to a stricter approach?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The barrel may not have held wine for twelve months', 'The whiskey becomes grape juice', 'The second fill is always cooked', 'The label creates bitul'), 0, 'After twelve months, the absorbed non-kosher wine flavor can lose its forbidden status.', false),
  (gen_random_uuid(), 10, 'Sherry Flavor', 'How does Rav Moshe answer the concern that sherry is added for flavor?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Flavor is never relevant in halacha', 'Only strong flavor prevents bitul; weak flavor can still be batel', 'Whiskey cannot absorb any taste', 'Wine flavor is always pagum in every case'), 1, 'A weak contribution of flavor may not be significant enough to prevent bitul.', false),
  (gen_random_uuid(), 10, 'Sherry Flavor', 'How does the Mishnah Halachos explain the role of sherry in the cask?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It turns the whiskey into wine', 'It creates six parts water', 'It prevents bad wood flavor from entering rather than directly flavoring the whiskey', 'It makes the barrel new'), 2, 'On that approach, the sherry is not viewed as the flavoring ingredient in the whiskey.', false),
  (gen_random_uuid(), 10, 'Bitul Lechatchilla', 'Why may bitul lechatchilla be less of a concern for ordinary whiskey companies?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('They ask every Jew to rely on bitul', 'They use only Jewish-owned wine', 'They never use barrels', 'They produce mainly for non-Jewish customers'), 3, 'The nullification is not being done specifically for Jewish consumers.', true),
  (gen_random_uuid(), 10, 'Sherry Cask Leniencies', 'What is the practical difference between blended whiskey with a small amount of wine and sherry cask whiskey?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Added wine may have clear one-to-six bitul, while barrel absorption is harder to measure', 'Blended whiskey is always grape juice', 'Sherry casks are always mevushal', 'There is no difference at all'), 0, 'Actual added wine can be compared to the whiskey volume more directly than absorbed barrel flavor.', true),
  (gen_random_uuid(), 10, 'Hamshacha', 'When does grape juice become halachic wine for these laws?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('When grapes are first picked', 'When juice is intentionally separated from the skins and seeds', 'Only after bottling', 'Only after kiddush is made'), 1, 'Hamshacha begins when the juice is drawn away from the grape solids.', true),
  (gen_random_uuid(), 10, 'Hamshacha', 'Workers crush grapes and remove a little juice only to test sweetness in a lab. Why is that more lenient?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Testing juice is always mevushal', 'The workers are standing', 'The separation is only for testing, not to begin winemaking', 'The juice is automatically six-to-one'), 2, 'A lab sample is not considered the start of separating the wine from the solids.', true),
  (gen_random_uuid(), 10, 'Grappa and Brandy', 'What is the basic difference between grappa and brandy?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Brandy is barley beer; grappa is honey water', 'Brandy is frozen wine; grappa is pasteurized wine', 'There is no halachic difference', 'Brandy is distilled wine; grappa is distilled grape skins, seeds, and stems left from wine'), 3, 'The two drinks come from different grape-based materials but both raise wine concerns.', false),
  (gen_random_uuid(), 10, 'Sherry Cask Leniencies', 'A person asks if he may serve whiskey that contains a small amount of actual red wine. What is a key lenient point?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('There may be six times more whiskey than wine', 'Red wine is not wine', 'The bottle is sealed', 'The whiskey is served at a simcha'), 0, 'The added wine can be batel when the whiskey is at least six times its volume.', false),
  (gen_random_uuid(), 10, 'Sherry Cask Leniencies', 'Which bottle should raise more concern in the sherry cask discussion?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('A bottle aged in refill sherry casks', 'A bottle advertised as first-fill sherry cask', 'A bottle with no sherry claim', 'A bourbon barrel bottle'), 1, 'First-fill suggests fresher and stronger sherry absorption.', false),
  (gen_random_uuid(), 10, 'Hamshacha', 'A non-Jew stomps grapes in a gat where the juice flows away. What is the concern?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The grapes become bishul akum', 'The seeds become dairy', 'He may touch juice after hamshacha, forbidding the mixture', 'The wine becomes mevushal'), 2, 'A gat allows juice to separate, so touching after hamshacha becomes a real issue.', true),
  (gen_random_uuid(), 10, 'Grappa and Brandy', 'Properly kosher brandy or grappa was later touched by a non-Jew. Why may it remain permitted?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It is owned by a non-Jew', 'It is never made from grapes', 'It is always diluted with milk', 'It is mevushal through distillation and its flavor is very different from wine'), 3, 'After proper production, the drink is no longer ordinary non-mevushal wine.', false),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'The prohibition of drinking beer with non-Jews is connected to concern for intermarriage.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The gezeirah is meant to prevent social closeness that can lead to intermarriage.', true),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'The beer prohibition was a later and more limited practice than the formal gezeiros of pas akum, bishul akum, and stam yeinam.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'That is why its rules have more built-in leniencies.', true),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'Tosfos allows ordering beer from elsewhere when lodging in a non-Jew''s inn, because it is like your temporary home.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The inn can be considered the Jew''s lodging place for this leniency.', true),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'According to the S.A., the main prohibition applies when the drink is consumed at the non-Jewish establishment.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The concern is drinking in the social setting of the seller or host.', true),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'The Rama limits the prohibition mainly to date beer.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'He follows the view that only the original common drink was included.', true),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'The Gra fully accepts the Rama''s leniency for ordinary beer.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The Gra rejects the Rama''s leniency and treats common beers more strictly.', false),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'According to the S.A. as explained by the Kaf HaChaim, permanent drinking in a non-Jewish establishment is permitted if it happens only once.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Permanent drinking there is forbidden even once.', false),
  (gen_random_uuid(), 11, 'Parties with Non-Jews', 'A non-Jewish wedding meal is permitted if the host ordered kosher food.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The S.A. prohibits eating even kosher food at a non-Jewish wedding feast.', false),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'Why can beer sometimes be permitted outside the non-Jewish setting, unlike stam yeinam?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The beer restriction was more limited from the beginning', 'Beer is always mevushal', 'Beer has no social concern', 'Beer is never alcoholic'), 0, 'It was not enacted with the same full structure as stam yeinam.', true),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'According to the Kaf HaChaim''s reading of the S.A., which two conditions help permit drinking beer in a non-Jewish location?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Hot and sweet', 'Non-permanent and not consistent', 'Mevushal and sealed', 'Owned by a Jew and red'), 1, 'Casual and infrequent drinking is not the fixed social drinking Chazal were concerned about.', false),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'A traveler wants a beer in his hotel room. What is the S.A.-based answer?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('He may only drink it in the hotel bar', 'He may not drink beer anywhere on the trip', 'He may order it to his room', 'He may drink only date beer'), 2, 'The room is treated like his temporary home, not the public non-Jewish drinking place.', true),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'A traveler wants to sit alone in the hotel bar with a beer. According to the stricter S.A./Bach approach, what is the issue?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Beer is chametz after Pesach', 'Sitting alone creates bishul akum', 'The glass needs tevilah first', 'The non-Jewish establishment itself is the problem'), 3, 'The concern applies even when he is alone in the non-Jewish drinking venue.', false),
  (gen_random_uuid(), 11, 'Business Drinking', 'A non-Jewish client says, ''Let''s grab a beer'' after closing a deal. What leniency is sometimes relied upon?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Avoiding animosity', 'The beer turns into water', 'A business deal makes it kiddush', 'All beer is grape juice'), 0, 'Rav Moshe allows room for leniency when refusal may damage the relationship.', true),
  (gen_random_uuid(), 11, 'Public Venues', 'Why may a beer at a baseball game be more lenient according to the S.A. framework?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Sports stadiums are Jewish homes', 'It is casual and not a regular fixed drinking session', 'Beer at games is always non-alcoholic', 'The crowd makes it mevushal'), 1, 'Infrequent, non-permanent drinking is less like the prohibited social setting.', false),
  (gen_random_uuid(), 11, 'Coffee Shops', 'Why is coffee in a non-Jewish coffee shop discussed for Sephardim?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Coffee is made from grapes', 'Coffee is always date beer', 'Some understand the S.A. to include even prominent non-alcoholic drinks', 'The issue is only chalav Yisrael'), 2, 'The Gra and others read the S.A. broadly, though others are lenient.', false),
  (gen_random_uuid(), 11, 'Parties with Non-Jews', 'What is Rav Moshe''s approach to a company party for a non-Jewish workplace?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Always attend because it is not a wedding', 'Attend only if wine is served', 'It is permitted only outdoors', 'Avoid unless not attending would cause animosity'), 3, 'Rav Moshe is stringent about parties but allows a need to avoid animosity.', false),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'A bar has outdoor seating owned by the bar. According to the discussion, how is that treated?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('As part of the bar', 'Like the Jew''s home', 'Like a public street outside the store', 'Like a hotel room'), 0, 'Outdoor seating controlled by the bar remains part of the establishment.', true),
  (gen_random_uuid(), 11, 'Beer with Non-Jews', 'Two Jews sit together in a non-Jewish bar with no non-Jews at the table. According to the Bach, what is the halacha?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It is automatically permitted', 'It is still forbidden', 'It depends only on the brand of beer', 'It is permitted if they sit quietly'), 1, 'The Bach prohibits drinking in the non-Jewish establishment even without direct company.', false),
  (gen_random_uuid(), 11, 'Parties with Non-Jews', 'A non-Jewish coworker invites you to his wedding and orders kosher food. What is the core problem?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Kosher food becomes non-kosher by invitation', 'The wedding ring is a kli', 'Eating at the wedding feast itself is prohibited', 'Only dessert is prohibited'), 2, 'The prohibition applies to the feast even when the food itself is kosher.', false),
  (gen_random_uuid(), 11, 'Parties with Non-Jews', 'Why may a ger have more room to attend a non-Jewish parent''s birthday party?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('A ger is not Jewish for parties', 'Birthday cake is always mevushal', 'Family parties are always mitzvah meals', 'Animosity, kibbud for biological parents, and weaker acceptance of this party prohibition'), 3, 'The cited teshuva combines several reasons for leniency in that specific family setting.', false),
  (gen_random_uuid(), 12, 'Non-Jewish Children', 'If a non-Jewish baby touches Jewish-owned wine, the wine is forbidden to drink but permitted for benefit.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'There is an intermarriage concern for drinking, but no concern the baby performed libation.', true),
  (gen_random_uuid(), 12, 'Muslims', 'Wine touched by a Muslim may not be drunk, but one may benefit from it.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'There is concern for intermarriage but no concern for idolatrous libation.', true),
  (gen_random_uuid(), 12, 'Safek Touch', 'According to Rav Ovadya, if one is unsure whether a Muslim touched the wine, the wine may be drunk.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The remaining concern is rabbinic, so safek derabanan l''kula applies.', true),
  (gen_random_uuid(), 12, 'Public Shabbos Violation', 'To be considered a public Shabbos violator in the classic sense, the act must be done three times in front of at least ten people.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The Rashba gives this standard for making the violation public.', true),
  (gen_random_uuid(), 12, 'Public Shabbos Violation', 'Wine touched by a public Shabbos violator is forbidden for benefit according to the Shach.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The Shach forbids drinking but permits benefit because there is no libation concern.', false),
  (gen_random_uuid(), 12, 'Mumar', 'A mumar cannot forbid wine if he still has a bris milah.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The S.A. says a mumar has the status of a non-Jew for this halacha even with a bris.', false),
  (gen_random_uuid(), 12, 'Traditional Jews', 'All poskim agree that wine touched by a traditional Jew who recites kiddush is forbidden.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Rav Ovadya allows it based on the Binyan Tzion, though Rav Sternbuch is stricter.', false),
  (gen_random_uuid(), 12, 'Non-Jewish Children', 'Why is wine touched by a non-Jewish baby permitted for benefit?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('There is no concern that the baby performed libation', 'A baby cannot touch wine halachically', 'Baby touch is like mevushal', 'All child-touch is batel'), 0, 'Benefit is tied to the libation concern, which does not apply to a baby.', true),
  (gen_random_uuid(), 12, 'Muslims', 'What is the main reason wine touched by a Muslim is not assur b''hanaah?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Muslims are considered Jewish', 'Muslims believe in one G-d and there is no libation concern', 'The wine becomes mevushal', 'The touch is always indirect'), 1, 'The drinking concern remains, but the avodah zarah concern does not.', true),
  (gen_random_uuid(), 12, 'Christians', 'One is unsure whether a Christian touched the wine. What is a key difference between Sephardi and Ashkenazi practice discussed?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Ashkenazim are always stricter', 'Everyone permits benefit but forbids drinking', 'Sephardim are stricter; Ashkenazim rely more on the Rama bedieved', 'Everyone forbids even unopened bottles'), 2, 'The Rama''s view that Christians today do not libate creates more room for Ashkenazim bedieved.', false),
  (gen_random_uuid(), 12, 'Mumar', 'Why does a public Shabbos violator''s touch create a wine problem even without intermarriage?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('His wine becomes chametz', 'He is suspected of adding water', 'A Jew''s touch is always worse than a non-Jew''s', 'Chazal gave him a limited non-Jewish status for this halacha'), 3, 'The issue is not intermarriage but the special status assigned to public Shabbos violation.', true),
  (gen_random_uuid(), 12, 'Public Shabbos Violation', 'What is the Shach''s conclusion about wine touched by a public Shabbos violator?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Forbidden to drink but permitted for benefit', 'Permitted to drink', 'Forbidden for all benefit', 'Permitted only if cooked afterward'), 0, 'Since there is no actual libation concern, benefit remains permitted.', true),
  (gen_random_uuid(), 12, 'Traditional Jews', 'How does the Binyan Tzion view a Jew who drives to shul but also recites kiddush?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('He is certainly worse than an idol worshiper', 'There is basis to be lenient, though one who is careful is blessed', 'His wine is assur b''hanaah to everyone', 'He is treated exactly like a non-Jewish baby'), 1, 'His behavior sends mixed messages, so the Binyan Tzion gives room for leniency.', false),
  (gen_random_uuid(), 12, 'Respectful Secular Jews', 'A secular Jew would be embarrassed to violate Shabbos in front of a prominent Rav. What do many poskim say about his wine?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It is assur b''hanaah', 'It is forbidden like yayin nesech', 'It does not become forbidden', 'It is permitted only for Sephardim'), 2, 'The Mishnah Berurah''s standard means he may not be a public Shabbos violator.', true),
  (gen_random_uuid(), 12, 'Tinok Shenishba', 'What is one reason to be lenient with a genuine tinok shenishba who never received Jewish education?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('He is not Jewish', 'His touch is never physical touch', 'He always believes in avodah zarah', 'He may not be fully responsible for his lack of observance'), 3, 'Some poskim do not apply the classic penalty to someone who was never educated.', true),
  (gen_random_uuid(), 12, 'Wine Status', 'Which case is most clearly forbidden to drink but permitted for benefit?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Wine touched by a Muslim adult', 'Wine touched by a frum Jew', 'Wine never touched by anyone', 'Wine mixed into cake batter'), 0, 'Muslim touch keeps the intermarriage concern but not the libation concern.', false),
  (gen_random_uuid(), 12, 'Safek Touch', 'Why does Rav Ovadya treat doubtful Muslim touch more leniently than doubtful Christian touch for Sephardim?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Muslims cannot touch wine', 'The Muslim case has only a rabbinic intermarriage concern, while the Christian case has an added libation-related concern', 'Christians always own the wine', 'Safek never matters for wine'), 1, 'Different underlying concerns change how the safek is treated.', false),
  (gen_random_uuid(), 12, 'Modern Non-Religious Jews', 'Why does Rav Sternbuch remain strict even for many irreligious Jews today?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('He treats all wine as mevushal', 'He permits only Christian wine', 'The status may prevent religious Jews from learning from their behavior', 'He holds children can perform libation'), 2, 'On this approach, the concern is negative influence, not only punishment.', false),
  (gen_random_uuid(), 12, 'Modern Non-Religious Jews', 'Which category is the strongest case for forbidding the wine to drink?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('A traditional Jew who recites kiddush', 'A respectful Jew embarrassed before a Rav', 'A genuine tinok shenishba according to the lenient view', 'An anti-religious Jew who would violate Shabbos in front of a Rav'), 3, 'All agree that an anti-religious public violator is treated more strictly.', false);

do $$
declare
  author_id uuid;
  inserted_count integer;
begin
  select profile.id
  into author_id
  from public.profiles profile
  where profile.role = 'global_admin'
  order by profile.created_at, profile.email
  limit 1;

  if author_id is null then
    raise exception 'No global_admin profile found. Create/promote a Global Admin before importing review questions.';
  end if;

  delete from public.review_questions question
  where question.is_library_question = true
    and question.visibility = 'everyone'::public.content_visibility
    and question.week between 8 and 12;

  insert into public.review_questions (
    id,
    chaburah_id,
    topic,
    week,
    prompt,
    kind,
    choices,
    visibility,
    enabled,
    created_by,
    created_at,
    updated_at,
    publication_status,
    source_question_id,
    is_library_question,
    published_at,
    is_model_question
  )
  select
    import_question.id,
    null,
    import_question.topic,
    import_question.week,
    import_question.prompt,
    import_question.kind,
    import_question.choices,
    'everyone'::public.content_visibility,
    true,
    author_id,
    now(),
    now(),
    'published',
    null,
    true,
    now(),
    import_question.is_model_question
  from import_public_review_question_bank import_question;

  get diagnostics inserted_count = row_count;

  insert into public.review_question_answers (
    question_id,
    correct_choice_index,
    explanation
  )
  select
    import_question.id,
    import_question.correct_choice_index,
    import_question.explanation
  from import_public_review_question_bank import_question;

  raise notice 'Imported % public review questions.', inserted_count;
end
$$;

commit;

select
  question.week,
  count(*) as public_library_questions,
  count(*) filter (where question.is_model_question) as model_questions
from public.review_questions question
where question.is_library_question = true
  and question.visibility = 'everyone'::public.content_visibility
  and question.week between 8 and 12
group by question.week
order by question.week;
