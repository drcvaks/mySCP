-- Import public review question bank for Weeks 1-7.
-- Generated from: C:\Users\Family\Downloads\mySCP_175_Question_Bank_Weeks_1-7-Updated.csv
-- Rows: 162
--
-- Run this in the Supabase SQL editor after the core schema/migrations are applied.
-- Recommended: run supabase/pilot_cleanup.sql first if this is replacing old test review content.
--
-- Behavior:
-- - keeps users, profiles, chaburos, memberships, settings, and notification preferences
-- - replaces existing public-library review questions for Weeks 1-7
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
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'Nat Bar Nat refers to weakened flavor transferred through an intermediate kli.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The flavor moved from food to kli and then onward, so it is weakened.', true),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'A ben-yomo kli is a utensil used within the last 24 hours.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Within 24 hours, absorbed flavor is treated as stronger.', true),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'An eino ben-yomo kli has flavor that is generally pagum.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'After 24 hours the absorbed taste is considered defective.', true),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'Nat Bar Nat applies the same way to non-kosher meat as it does to basar b''chalav.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The leniency is mainly in basar b''chalav, not inherent issurim.', true),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'Milk cooked in a clean fleishig ben-yomo pot is permitted because the pot is clean.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Absorbed meat flavor can enter the milk even if the pot is clean.', true),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'The Gemara''s example discusses fish and a meat plate.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The sugya discusses fish that absorbed meat flavor from a plate.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'Ta''am k''ikar means that flavor can have the halachic status of the food itself.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Flavor of meat or milk can create a real halachic problem.', true),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'After 24 hours, absorbed flavor usually becomes stronger.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'It becomes weaker and pagum, not stronger.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'Shmuel permits the fish in the basic Nat Bar Nat case.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The halacha follows Shmuel in the Gemara''s case.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'Siman 95 deals with practical questions of parve food cooked in meat or dairy utensils.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'That is the core topic of the siman.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'What is the best definition of Nat Bar Nat?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Direct meat mixed with milk', 'Flavor transferred indirectly through a kli', 'Steam from an oven', 'Food cooked by a non-Jew'), 1, 'Nat Bar Nat is indirect, weakened flavor transfer.', true),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'Why can fish on a fleishig plate sometimes be eaten with dairy?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Fish is never affected by flavor', 'The meat flavor is weakened', 'Dairy cancels fish', 'The plate is always cold'), 1, 'The meat taste reached the fish indirectly.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'What happens to absorbed flavor after 24 hours?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It becomes stronger', 'It becomes pagum', 'It becomes dairy', 'It becomes assur forever'), 1, 'After 24 hours, flavor is generally defective.', true),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'Which concept says flavor can be treated like the food itself?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Nat Bar Nat', 'Ta''am k''ikar', 'Lo sechaneim', 'Reicha'), 1, 'Ta''am k''ikar means taste can carry halachic status.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'Which case is NOT a Nat Bar Nat leniency?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Fish on a meat plate with dairy', 'Parve pasta from a meat pot with cheese in some cases', 'Water cooked in a non-kosher pot', 'Parve food that absorbed weak meat flavor'), 2, 'Nat Bar Nat does not permit inherent non-kosher absorbed flavor.', true),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'A clean fleishig pot used today is called:', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Eino ben-yomo', 'Ben-yomo', 'Parve', 'Pagum only'), 1, 'Ben-yomo means used within 24 hours.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'A clean fleishig pot unused for two days is called:', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Ben-yomo', 'Eino ben-yomo', 'Basar b''chalav', 'Reicha'), 1, 'After 24 hours it is no longer ben-yomo.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'What is the main reason Nat Bar Nat is more lenient than direct meat and milk?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('There is no heat', 'The flavor is indirect and weakened', 'The foods are always cold', 'Fish has no taste'), 1, 'The transfer is not a strong direct fusion.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'In the basic sugya, who argues with Rav and is accepted lema''aseh?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Shmuel', 'Rambam', 'Rama', 'Shach'), 0, 'The Gemara rules like Shmuel.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'Which food category is being discussed when cooked in meat or dairy equipment?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Meat', 'Dairy', 'Parve', 'Wine'), 2, 'The siman discusses parve foods absorbing meat or dairy taste.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'You cooked plain pasta in a clean fleishig pot. What question matters first?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Was the pot ben-yomo?', 'Was the pasta expensive?', 'Was the spoon silver?', 'Was the stove electric?'), 0, 'Ben-yomo status affects how strong the absorbed taste is.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'A student says Nat Bar Nat permits any absorbed issur. What should you answer?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Correct', 'Only on Shabbos', 'Not generally; it is mainly for basar b''chalav', 'Only for wine'), 2, 'Inherent issurim are treated more strictly.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'Hot fish was placed on a clean fleishig plate. According to the basic halacha, what is the key leniency?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('No flavor exists', 'The flavor is Nat Bar Nat', 'Fish is dairy', 'The plate becomes parve'), 1, 'The fish absorbed only weakened meat flavor.', false),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'If milk is cooked in a clean fleishig ben-yomo pot, why is it a problem?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Because of visible meat only', 'Because absorbed meat flavor enters the milk', 'Because milk cannot be cooked', 'Because dairy is always forbidden'), 1, 'Ta''am k''ikar makes absorbed flavor significant.', true),
  (gen_random_uuid(), 1, 'Nat Bar Nat Basics', 'Which fact would make a kli less problematic?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It was used 1 hour ago', 'It was used 3 hours ago', 'It was unused for over 24 hours', 'It is metal'), 2, 'After 24 hours, absorbed flavor becomes pagum.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'DE stands for Dairy Equipment.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'DE means the food was made on dairy equipment.', true),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'A DE label always means the product contains dairy ingredients.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'It may contain no dairy ingredients at all.', true),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'For Sephardim, DE products are generally treated as fully parve.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The notes present Sephardim as lenient with DE.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'Ashkenazim always eat DE products together with meat lechatchilla.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'For Ashkenazim, ben-yomo equipment can create limits.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'Some OU-D products may not contain actual dairy ingredients.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Sometimes OU-D is used for production or labeling reasons.', true),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'A lack of milk allergy warning always proves the product is parve for halacha.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Allergy labels do not always determine kosher dairy status.', true),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'Large companies may run dairy and non-dairy productions close together.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'This is one reason DE or D labels may be used.', true),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'A mashgiach may need to verify equipment cleanliness for OU-DE.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Clean equipment is part of the certification concern.', true),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'Snyder''s and Oreos are mentioned as examples of labeling complexity.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The notes discuss such examples.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'DE is the same thing as chalav Yisrael.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'DE describes equipment, not the milk supervision category.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'What does DE mean?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Dairy Equipment', 'Dairy Extract', 'Dairy Exempt', 'Double Equipment'), 0, 'DE means the item was made on dairy equipment.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'For Sephardim, DE products are generally:', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Meat', 'Forbidden', 'Parve', 'Stam yeinam'), 2, 'The notes say Sephardim treat DE foods as 100% parve.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'For Ashkenazim, what fact often matters for DE?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('If the equipment was ben-yomo', 'If the package is blue', 'If the store is large', 'If it was bought online'), 0, 'Ben-yomo equipment means stronger dairy taste.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'Why might a company prefer OU-D instead of OU-DE?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('To avoid calling a mashgiach for each run', 'Because DE is not kosher', 'Because OU-D means parve', 'Because dairy labels cost less'), 0, 'OU-DE may require extra verification of cleanliness.', true),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'Why can an OU-D symbol be misleading to a consumer?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It always means meat', 'It may be on items without dairy ingredients', 'It means no supervision', 'It means non-kosher'), 1, 'OU-D can reflect equipment or company labeling choices.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'What should a consumer NOT rely on completely for kosher dairy status?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The hechsher', 'The allergy panel alone', 'A rav', 'A mashgiach'), 1, 'Allergy and halacha categories do not always match.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'What is one reason Kof-K may still mark DE?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Runs can change during production', 'The product is treif', 'The company sells wine', 'The item is always fish'), 0, 'Production can switch between dairy and non-dairy.', true),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'In the notes, Oreos are an example of:', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Non-kosher wine', 'Dairy labeling complexity', 'Fish and meat', 'Dishwasher soap'), 1, 'They may be labeled OU-D even without dairy ingredients.', true),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'Which question helps determine Ashkenazi practice for DE?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Were the machines clean and ben-yomo?', 'Was it bought on Monday?', 'Is it sweet?', 'Is it in a bag?'), 0, 'Equipment status affects the halacha.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'What is the broader theme of Week 2?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Stam yeinam', 'Dairy equipment and practical Nat Bar Nat', 'Fish danger only', 'Kiddush wine'), 1, 'Week 2 applies Nat Bar Nat to DE products.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'A snack is marked OU-D but has no dairy ingredients. What should you know?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It may still be labeled D because of equipment or policy', 'It is definitely meat', 'It has no hashgacha', 'It is always chalav Yisrael'), 0, 'OU-D can be used for practical production reasons.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'A Sephardi asks if a DE product may be eaten with meat. Based on the notes, the simple answer is:', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Generally yes', 'Never', 'Only after 6 hours', 'Only if it is fish'), 0, 'The notes say Sephardim treat DE as parve.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'An Ashkenazi wants to mix DE cookies into meat cholent. What is a key concern?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Were they made on ben-yomo dairy equipment?', 'Were they crunchy?', 'Were they expensive?', 'Were they bought in a kosher store?'), 0, 'Ben-yomo equipment can restrict lechatchilla mixing.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'A company runs non-dairy pretzels on equipment sometimes used for dairy. Why keep D on the package?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Uniform labels and production flexibility', 'Because pretzels are meat', 'Because all pretzels contain milk', 'Because DE means no hashgacha'), 0, 'The notes mention marketing and production reasons.', false),
  (gen_random_uuid(), 2, 'Dairy Equipment', 'You see no milk allergy warning on a product. What is the safest conclusion?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It proves the product is parve halachically', 'It is useful but not absolute for halacha', 'It proves the product is meat', 'It means the hechsher is invalid'), 1, 'Allergy labeling does not always match kosher dairy status.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'Fish and meat together are treated as dangerous in halacha.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The sources mention danger and tzara''as.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'The Shulchan Aruch permits fish and meat together lechatchilla.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The Shulchan Aruch forbids eating them together.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'The Rama says it is preferable to eat or drink between fish and meat.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The notes state the custom is to eat or drink between them.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'Reicha means aroma or smell transfer.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Reicha is the halachic discussion of aroma.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'Baking fish and meat together can raise a reicha concern.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The Rama recommends avoiding it.', true),
  (gen_random_uuid(), 3, 'Fish and Meat', 'All authorities agree the danger of fish and meat no longer exists.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Some suggest it may have changed, but this is not the accepted blanket ruling.', true),
  (gen_random_uuid(), 3, 'Fish and Meat', 'Some poskim recommend separate utensils for fish.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The Tur mentions those who are stringent.', true),
  (gen_random_uuid(), 3, 'Fish and Meat', 'The issue of fish and meat is only basar b''chalav.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'It is discussed as sakana, danger, not basar b''chalav.', true),
  (gen_random_uuid(), 3, 'Fish and Meat', 'The Taz distinguishes between baking and cooking in this topic.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Cooking together is more serious than reicha alone.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'What does reicha mean?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Absorbed taste', 'Aroma', 'A gift', 'A utensil'), 1, 'Reicha is smell or aroma transfer.', true),
  (gen_random_uuid(), 3, 'Fish and Meat', 'What does the Rama recommend between fish and meat?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('A 6-hour wait', 'Eating or drinking something', 'Hagalah', 'Throwing out the dishes'), 1, 'This replaces washing according to common custom.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'Which case is more severe than reicha?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Cooking fish and meat together', 'Smelling fish in a store', 'Cold fish near meat', 'Buying fish in a bag'), 0, 'Cooking fuses flavors, not just aromas.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'What is one practical question from this week?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('May fish be cooked in a fleishig pot?', 'May wine be gifted?', 'May DE cookies be eaten?', 'May a dishwasher be used?'), 0, 'The notes analyze absorbed meat flavor in fish.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'What is the basic ruling of the Shulchan Aruch on eating fish and meat together?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Permitted', 'Forbidden', 'Only forbidden on Shabbos', 'Only forbidden with cheese'), 1, 'The Shulchan Aruch forbids fish and meat together.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'Which statement is most accurate?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Fish and meat is exactly the same as milk and meat', 'Fish and meat is discussed because of danger', 'Fish and meat is only a labeling issue', 'Fish and meat is only about wine'), 1, 'It is a sakana category.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'You baked fish and meat in the same oven in separate pans. What concept is most relevant?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Reicha', 'Lo sechaneim', 'DE', 'Stam yeinam'), 0, 'The issue is aroma transfer in an oven.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'You cooked fish together with meat in one pot. Why is that worse than aroma?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The flavors actually mix', 'The pot is always dairy', 'Fish becomes chametz', 'The lid is glass'), 0, 'Cooking creates direct taste transfer.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'Someone wants to eat fish and then meat at a meal. What is a common practice?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Eat or drink something between them', 'Wait six hours', 'Do hagalah on the plate', 'Avoid the meal'), 0, 'The Rama says the custom is to eat or drink between.', false),
  (gen_random_uuid(), 3, 'Fish and Meat', 'A person asks why fish in a fleishig pot is different from milk in a fleishig pot. What is the key issue?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Fish and meat is about sakana', 'Fish is dairy', 'Fish cannot absorb taste', 'Pots do not matter'), 0, 'The concern is danger, not classic basar b''chalav.', false),
  (gen_random_uuid(), 4, 'Washing Dishes', 'The Shulchan Aruch is more lenient than the Rama in the clean dishes washing case.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The S.A. permits clean ben-yomo utensils washed together in the basic case.', true),
  (gen_random_uuid(), 4, 'Washing Dishes', 'The Rama forbids when both sides are ben-yomo even if clean in the hot pot case.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The Rama follows the stricter approach.', false),
  (gen_random_uuid(), 4, 'Washing Dishes', 'Dirty utensils are less problematic than clean utensils.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Food residue makes the case more serious.', true),
  (gen_random_uuid(), 4, 'Washing Dishes', 'If one utensil is dirty, shishim may become relevant.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Shishim against residue can affect the ruling.', true),
  (gen_random_uuid(), 4, 'Washing Dishes', 'Kli sheini is generally treated more leniently than kli rishon.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'A kli sheini has a weaker cooking status.', true),
  (gen_random_uuid(), 4, 'Washing Dishes', 'The Taz gives reasons why the Rama is stricter in the washing case.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The Taz explains possible direct or connected flavor issues.', false),
  (gen_random_uuid(), 4, 'Washing Dishes', 'According to the S.A., Nat Bar Nat can permit clean dishes washed together in the described case.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Both flavors are weakened in the water.', true),
  (gen_random_uuid(), 4, 'Washing Dishes', 'Food residue is ignored if the dishes are expensive.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Expense is not the halachic basis.', true),
  (gen_random_uuid(), 4, 'Washing Dishes', 'If both utensils are clean and one is eino ben-yomo, the case is generally easier.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Eino ben-yomo flavor is pagum.', false),
  (gen_random_uuid(), 4, 'Washing Dishes', 'In the classic washing case, what makes the case more severe?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Both utensils are dirty', 'The dishes are white', 'The water is cold', 'The kitchen is small'), 0, 'Residue gives direct food taste.', true),
  (gen_random_uuid(), 4, 'Washing Dishes', 'According to the Rama, what if clean dairy and fleishig ben-yomo utensils are washed together in hot kli rishon water?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Everything is always permitted', 'It can be prohibited', 'It becomes wine', 'It needs no discussion'), 1, 'The Rama is stringent when both are ben-yomo.', true),
  (gen_random_uuid(), 4, 'Washing Dishes', 'What does shishim mean in these cases?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('60 times the forbidden taste or residue', '6 hours', 'A type of soap', 'A wine category'), 0, 'Shishim can nullify residue in the mixture.', false),
  (gen_random_uuid(), 4, 'Washing Dishes', 'Why is dirty residue so important?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It is direct food taste', 'It changes the color', 'It cools the water', 'It proves the dish is old'), 0, 'Actual food residue is stronger than absorbed Nat Bar Nat taste.', false),
  (gen_random_uuid(), 4, 'Washing Dishes', 'What does kli sheini mean?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('A second vessel', 'A wine bottle', 'A dishwasher filter', 'A dairy label'), 0, 'A kli sheini is the vessel into which hot food or water was transferred.', true),
  (gen_random_uuid(), 4, 'Washing Dishes', 'What does the Taz say may happen when the utensils touch?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Flavor can transfer directly', 'They become parve', 'The water freezes', 'Nothing can happen'), 0, 'Direct transfer is more severe than weakened taste in water.', false),
  (gen_random_uuid(), 4, 'Washing Dishes', 'What is one reason the Rama is stricter even if utensils do not touch?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The flavor is connected to its source during cooking', 'The pot is glass', 'The water is blue', 'The dishes are expensive'), 0, 'The flavor may not be fully weakened while still connected to the hot source.', true),
  (gen_random_uuid(), 4, 'Washing Dishes', 'If one kli is eino ben-yomo and clean, why is the case easier?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Its taste is pagum', 'It becomes meat', 'It cannot absorb', 'It is always cold'), 0, 'Eino ben-yomo absorbed taste is defective.', true),
  (gen_random_uuid(), 4, 'Washing Dishes', 'What should be done with the water in some permitted cases?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Drink it', 'Discard it', 'Freeze it', 'Use it for kiddush'), 1, 'The Rama mentions throwing out the water due to pagum mixed taste.', false),
  (gen_random_uuid(), 4, 'Washing Dishes', 'What is the main theme of this week?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Hot dishwashing cases', 'Stam yeinam', 'Lo sechaneim', 'Coffee shops'), 0, 'The sugya analyzes washing meat and dairy utensils.', false),
  (gen_random_uuid(), 4, 'Washing Dishes', 'Clean dairy dishes were placed in a clean fleishig ben-yomo pot of hot water. Who is more likely to permit?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Shulchan Aruch', 'Rama', 'Everyone forbids', 'No one discusses it'), 0, 'The S.A. permits based on Nat Bar Nat.', true),
  (gen_random_uuid(), 4, 'Washing Dishes', 'Same case according to the Rama: what is the likely result?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('More stringent; everything may be forbidden', 'Always permitted', 'Only the water is permitted', 'Only the stove is forbidden'), 0, 'The Rama is machmir when both are ben-yomo.', false),
  (gen_random_uuid(), 4, 'Washing Dishes', 'A dirty fleishig spoon with residue is washed with dairy dishes. What becomes important?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Whether there is shishim against the residue', 'The spoon''s color', 'The brand of soap only', 'The time of day'), 0, 'Actual food residue can forbid unless batel.', false),
  (gen_random_uuid(), 4, 'Washing Dishes', 'Dairy and fleishig dishes are washed one after the other in hot parve water. Why can this be easier?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The first flavor is disconnected before the second enters', 'Because water is always cold', 'Because parve water cannot absorb', 'Because plates do not absorb'), 0, 'Once removed, the first flavor can be considered weakened.', false),
  (gen_random_uuid(), 4, 'Washing Dishes', 'Why is kli sheini a helpful fact in accidental washing cases?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It is weaker for cooking/absorbing', 'It means the dishes are new', 'It means the food is parve', 'It means there is no water'), 0, 'A kli sheini is often treated more leniently.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'Separate sponges for dairy, fleishig, and parve are recommended.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The concern is food remnants in the sponge.', true),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'Separate dishwashing gloves are also recommended.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The notes extend the concern to gloves.', true),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'If the wrong sponge is used once, the dishes are automatically forbidden.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The notes combine several factors to permit many cases.', true),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'Water that is not yad soledes bo is a leniency.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Cooler water is less able to transfer taste.', true),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'Soap may make food remnants pagum.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'This is a major noten ta''am lifgam factor.', true),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'Finding a dairy spoon in a fleishig drawer is always a disaster.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'A safek-sfeika can permit it.', true),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'Noten ta''am lifgam means a defective or unpleasant taste.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The taste is pagum and does not forbid in the same way.', true),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'The S.A. discusses adding ash to water as pogem.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The notes bring the S.A.''s view.', true),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'The Shach challenges the S.A.''s ash case.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The Shach questions the source and proof.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'Soap and ash are exactly the same in all opinions.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Later poskim distinguish genuine pogem agents from ash.', true),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'Why are separate sponges recommended?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Food remnants may remain', 'They look nicer', 'They save water', 'They prevent rust'), 0, 'Residue can transfer between dairy and fleishig dishes.', true),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'What should be done before reusing the wrong sponge?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Clean it well', 'Throw out the sink', 'Kasher the house', 'Wait a week'), 0, 'The notes say the sponge should be properly cleaned.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'Which factor helps permit dishes washed with the wrong sponge?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The water may not be yad soledes bo', 'The sponge is expensive', 'The spoon is silver', 'The plate is round'), 0, 'If water is not hot enough, taste transfer is limited.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'What else might help permit the dishes?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Maybe the sponge was clean', 'The kitchen was quiet', 'The water was clear', 'The dishes were stacked'), 0, 'If no residue was present, the concern is weaker.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'How can flowing water help?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It may create shishim against small residue', 'It makes the sponge new', 'It turns dairy into parve', 'It changes glass into metal'), 0, 'A small amount may be nullified in the flow.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'What does soap possibly do to residue?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Makes it pagum', 'Makes it meat', 'Makes it stronger', 'Makes it wine'), 0, 'Soap can ruin the taste.', true),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'What permits a dairy spoon found in a fleishig drawer?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Safek-sfeika', 'Lo sechaneim', 'Reicha', 'Stam yeinam'), 0, 'There are multiple doubts about what happened.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'One doubt in the spoon drawer case is:', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Maybe it was not washed with fleishig dishes', 'Maybe it is made of wood only', 'Maybe it belongs to a non-Jew', 'Maybe it is really a fork'), 0, 'That is part of the safek-sfeika.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'Another doubt in the spoon drawer case is:', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Maybe it was eino ben-yomo', 'Maybe it was used for wine', 'Maybe it was never manufactured', 'Maybe it was too large'), 0, 'Eino ben-yomo taste is pagum.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'What is the broader topic of noten ta''am lifgam?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Defective taste that does not forbid normally', 'A kind of wine', 'A fish utensil', 'A gift to a non-Jew'), 0, 'Pagum taste is halachically weaker.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'You used the fleishig sponge on dirty dairy dishes. Which factor may help?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Soap may be pogem the residue', 'The sponge has a color', 'The dishes are ceramic', 'The sink is large'), 0, 'Soap can ruin the taste of residue.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'You find a dairy spoon in a fleishig drawer. What is the likely first approach?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Consider safek-sfeika reasons to permit', 'Assume the whole drawer is treif', 'Throw out all spoons', 'Buy a new sink'), 0, 'Maybe it was not washed together; maybe it was eino ben-yomo.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'A sponge has visible food on it. Why is that worse?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Actual residue can transfer direct taste', 'Visible food is always parve', 'Food prevents water from heating', 'It makes soap invalid'), 0, 'Residue is stronger than absorbed weakened taste.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'The water used for the wrong sponge was lukewarm. Why does that matter?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It may not be yad soledes bo', 'It makes the spoon new', 'It proves the sponge was clean', 'It creates wine'), 0, 'Heat level affects absorption and transfer.', false),
  (gen_random_uuid(), 5, 'Sponges and Soap', 'A student says soap is irrelevant to kashrus. What should you answer?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Soap can be relevant because it may make taste pagum', 'Correct, soap never matters', 'Soap only matters for wine', 'Soap makes all dishes dairy'), 0, 'Noten ta''am lifgam is central to the discussion.', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'A dairy fork found in a fleishig dishwasher is automatically treif according to everyone.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'There are several sefekos and leniencies.', true),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'Dishwashers can be stricter than sinks because the water is heated inside the dishwasher.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Dishwasher water is more like irui kli rishon.', true),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'Dishwashers can also be more lenient because contact with residue is uncertain.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'There may be a safek whether particles touched the utensil.', true),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'Many poskim suggest kashering the fork when possible.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Waiting 24 hours and pouring boiling water', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'Parve dishes may be washed in a fleishig dishwasher in a clean parve-only cycle.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The filter and dishwasher should be clean.', true),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'Parve dishes should ideally be washed with dirty fleishig dishes.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'Residue may splash onto the parve dishes.', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'Starbucks is discussed because many locations sell hot non-kosher food.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'That creates a dishwashing concern.', true),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'Espresso, americano, and tea without hot milk are discussed as safer Starbucks options.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'They go directly into disposable cups from the machine.', true),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'Why can a dishwasher be stricter than a sink?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It heats its own water', 'It is quieter', 'It has racks', 'It uses electricity'), 0, 'The heated water has stronger halachic status.', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'Why can a dishwasher be more lenient than a sink?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It is uncertain whether residue touched the utensil', 'It never gets hot', 'It cannot contain food', 'It is made of plastic'), 0, 'There are multiple doubts about food particle contact.', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'What may poskim advise for a dairy fork found in a fleishig dishwasher?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Wait 24 hours and pour boiling water over it', 'Bury it', 'Use it for wine only', 'Throw out all dishes'), 0, 'This is a practical kashering suggestion when possible.', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'Why are the other dishes generally permitted in the fork case?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Any particles on the fork are likely batel in the water', 'They become dairy', 'Dishwashers cannot absorb', 'Forks do not hold food'), 0, 'A small amount is nullified in the dishwasher water.', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'When may parve dishes be washed in a fleishig dishwasher?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('In a clean parve-only cycle', 'Together with dirty meat dishes', 'Only with wine', 'Never'), 0, 'The dishwasher and filter should be clean.', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'What is the main Starbucks concern?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Utensils washed with non-kosher dishes', 'The cups are paper', 'Coffee beans are never kosher', 'The stores are too large'), 0, 'Milk pitchers and other keilim may be washed with non-kosher food equipment.', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'Which Starbucks item is among the safer choices discussed?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Espresso', 'Latte', 'Mocha with hot milk', 'Frappuccino'), 0, 'It goes directly from machine to disposable cup.', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'Why is hot milk at Starbucks more concerning?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('It uses a frothing pitcher that may be washed in the dishwasher', 'Milk is always non-kosher', 'Cups are too small', 'Coffee beans need bishul Yisrael'), 0, 'The pitcher may have been washed with non-kosher utensils.', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'What must be checked for flavored drinks?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Whether the flavor/base has a hechsher', 'Whether the straw is long', 'Whether the drink is cold only', 'Whether the cup has a logo'), 0, 'Flavorings may require kosher verification.', true),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'A dairy fork went through a hot fleishig dishwasher cycle. Which is a leniency?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Maybe residue never contacted the fork', 'The fork is shiny', 'The dishwasher is expensive', 'The fork has four prongs'), 0, 'This is one of the sefekos used in the notes.', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'You want to wash parve dishes in a fleishig dishwasher. What should you do first?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Run a clean parve-only cycle and clean the filter', 'Add dirty meat dishes', 'Use no soap', 'Put in dairy dishes too'), 0, 'Cleanliness and no dirty meat load are key conditions.', true),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'At Starbucks, which order best avoids washed pitchers?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Espresso in a disposable cup', 'Latte', 'Steamed milk', 'Hot chocolate'), 0, 'It does not use a milk frothing pitcher.', false),
  (gen_random_uuid(), 6, 'Dishwashers and Coffee', 'A student wants a Starbucks latte without a hechsher. What concern should you raise?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('The frothing pitcher may have been washed with non-kosher utensils', 'The milk is cold', 'The cup is disposable', 'Coffee cannot be kosher'), 0, 'The washed pitcher is the problem.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'Stam yeinam refers to non-kosher wine handled or owned in a way that creates halachic restrictions.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The siman discusses benefit from non-kosher wine.', true),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'The Shulchan Aruch is generally stricter about benefiting from stam yeinam.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The S.A. prohibits benefit more broadly.', true),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'The Rama allows benefit in some bedieved or loss situations.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The Rama quotes leniencies in certain circumstances.', true),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'One should establish a business mainly buying and selling non-kosher wine.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The notes say this should be avoided.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'Gifting non-kosher wine to a non-Jew can also raise lo sechaneim concerns.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'Giving gifts to a non-Jew may be prohibited unless the Jew benefits.', true),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'A gift to an employee may be different if it motivates better work.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'That benefit to the Jew can avoid lo sechaneim concerns.', true),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'It is ideal to give a Christmas gift and call it a Christmas gift.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The notes warn not to frame it as a religious holiday gift.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'Ashkenazim may have more room in bedieved cases, though some are machmir.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 0, 'The Rama allows more, but some authorities advise throwing it out.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'Payment for transporting stam yeinam is never discussed.', 'true_false'::public.review_question_kind, jsonb_build_array('True', 'False'), 1, 'The notes discuss schlepping, renting cars, and storage.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'What is the main topic of Week 7?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Stam yeinam', 'Fish and meat', 'DE cookies', 'Dishwasher filters'), 0, 'Week 7 moves into Siman 123 and wine issues.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'According to the S.A., profiting from non-kosher wine sales is:', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Forbidden', 'Recommended', 'Required', 'Only for Shabbos'), 0, 'The S.A. prohibits benefit from stam yeinam.', true),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'According to the Rama, accidental purchase of non-kosher wine may be:', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Permitted for benefit in some cases', 'Always used for kiddush', 'Always drunk', 'Given to a Jew'), 0, 'The Rama is lenient in bedieved/loss contexts.', true),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'What separate issue may apply when giving wine to a non-Jew?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Lo sechaneim', 'Nat Bar Nat', 'Kli sheini', 'Reicha'), 0, 'Giving a free gift to a non-Jew can be prohibited.', true),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'When can a gift to an employee be more acceptable?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('When it benefits the Jew by encouraging good work', 'When it is expensive', 'When it is on a religious holiday', 'When it is red wine'), 0, 'It is not a pure free gift if it serves the employer''s interest.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'What should one avoid saying when giving such a bonus near a holiday?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('This is an X-mas gift', 'Thank you for your work', 'This is a bonus', 'I appreciate your help'), 0, 'The notes advise not presenting it as a religious holiday gift.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'What should Sephardim do with gifted stam yeinam according to the stricter approach?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Dispose of it', 'Age it for value', 'Drink it', 'Use it for kiddush'), 0, 'If benefit is prohibited, keeping it for value is a problem.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'What do some authorities advise even Ashkenazim to do with inexpensive gifted non-kosher wine?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Throw it out', 'Sell it in a store', 'Use it for havdalah', 'Cook with it'), 0, 'The notes quote a machmir view.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'What business should a Jew avoid establishing?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('A business based on non-kosher wine profit', 'A bakery', 'A parve snack company', 'A coffee shop with disposable cups'), 0, 'Even the Rama agrees one should not build a business on stam yeinam.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'What indirect benefit case is discussed?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Transporting or storing non-kosher wine for pay', 'Eating fish', 'Washing sponges', 'Cooking pasta'), 0, 'The notes discuss schlepping, rentals, and storage.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'You receive non-kosher wine as a gift. What is a major difference to consider?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('S.A./Sephardi vs Rama/Ashkenazi approach', 'Whether the bottle is pretty', 'Whether the cork is plastic', 'Whether the label is English'), 0, 'The notes contrast stricter S.A. with Rama''s bedieved leniency.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'You want to give non-kosher wine to a non-Jewish employee. What issue besides stam yeinam matters?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Lo sechaneim', 'Fish and meat', 'DE', 'Kli sheini'), 0, 'A gift to a non-Jew must benefit the Jew to be permitted.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'Coworkers are chipping in for an expensive wine bottle for a non-Jewish boss. What is a practical concern?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Benefit from stam yeinam and gifting issues', 'The wine is too heavy', 'It needs a dishwasher', 'It is parve'), 0, 'Buying/gifting non-kosher wine raises multiple halachic issues.', false),
  (gen_random_uuid(), 7, 'Stam Yeinam', 'You own a van rental company and a winery wants to rent a van for non-kosher wine. What topic applies?', 'multiple_choice'::public.review_question_kind, jsonb_build_array('Indirect benefit from stam yeinam', 'Nat Bar Nat', 'Fish reicha', 'DE labels'), 0, 'The notes discuss renting equipment for transporting wine.', false);

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
    and question.week between 1 and 7;

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
  and question.week between 1 and 7
group by question.week
order by question.week;
