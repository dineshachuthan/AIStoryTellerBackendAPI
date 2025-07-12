-- ================================================
-- ESM Reference Data (Emotions, Sounds, Modulations)
-- ================================================

-- Insert ESM reference data
INSERT INTO esm_ref (category, value, description, sample_text, sort_order, is_active) VALUES
    -- Category 1: Emotions
    (1, 'Happy', 'Feeling joy or pleasure', 'She smiled brightly as she opened the surprise gift, her eyes sparkling with pure joy and excitement at the thoughtful gesture from her best friend.', 1, true),
    (1, 'Sad', 'Feeling sorrow or unhappiness', 'Tears welled up in his eyes as he read the farewell letter, knowing that this goodbye might be the last time they would ever speak to each other.', 2, true),
    (1, 'Angry', 'Feeling strong displeasure', 'His face turned red with fury as he slammed his fist on the table, unable to contain his rage at the injustice he had just witnessed.', 3, true),
    (1, 'Fear', 'Feeling afraid or anxious', 'Her heart pounded in her chest as footsteps echoed in the dark hallway, each sound making her grip the doorknob tighter with trembling hands.', 4, true),
    (1, 'Surprised', 'Feeling sudden wonder', 'She gasped and nearly dropped her coffee when her colleagues jumped out shouting surprise, having completely forgotten it was her birthday.', 5, true),
    (1, 'Disgusted', 'Feeling revulsion', 'He wrinkled his nose and pushed the plate away, the smell of the spoiled food making his stomach turn with overwhelming nausea.', 6, true),
    (1, 'Neutral', 'Feeling no strong emotion', 'She nodded politely as the stranger gave directions, maintaining a calm and composed expression throughout the brief interaction.', 7, true),
    (1, 'Excited', 'Feeling enthusiasm', 'The children bounced up and down with uncontainable energy, their faces glowing with anticipation for the adventure that awaited them at the amusement park.', 8, true),
    (1, 'Thoughtful', 'Feeling contemplative', 'He stared out the window with a distant look in his eyes, carefully considering each word he would say in tomorrow''s important meeting.', 9, true),
    (1, 'Confident', 'Feeling self-assured', 'She walked into the interview room with her head held high, knowing she had prepared thoroughly and was the perfect candidate for this position.', 10, true),
    
    -- Category 2: Sounds
    (2, 'Laughing', 'Sound of laughter', 'The room filled with contagious laughter as the comedian delivered the perfect punchline, causing everyone to burst into fits of giggles and loud guffaws.', 101, true),
    (2, 'Crying', 'Sound of crying', 'Soft sobs echoed through the empty room as she clutched the old photograph, tears streaming down her face in waves of grief.', 102, true),
    (2, 'Footsteps', 'Sound of walking', 'Heavy footsteps echoed through the marble hallway, each step creating a rhythmic pattern that announced the arrival of someone important.', 103, true),
    (2, 'Doors', 'Sound of doors', 'The old wooden door creaked loudly on its rusty hinges before slamming shut with a bang that rattled the windows.', 104, true),
    (2, 'Breathing', 'Sound of breathing', 'His heavy breathing filled the silence as he tried to catch his breath after running up five flights of stairs to make it on time.', 105, true),
    (2, 'Thunder', 'Sound of thunder', 'A deafening crack of thunder split the night sky, followed by the deep rumble that seemed to shake the very foundations of the house.', 106, true),
    (2, 'Wind', 'Sound of wind', 'The howling wind whistled through the trees, creating an eerie melody that sent shivers down their spines as they huddled closer to the campfire.', 107, true),
    (2, 'Rain', 'Sound of rain', 'The gentle patter of rain on the roof created a soothing rhythm, each drop adding to the peaceful symphony of the stormy afternoon.', 108, true),
    (2, 'Bells', 'Sound of bells', 'The church bells rang out across the village, their melodious chimes announcing the start of the wedding ceremony to all who could hear.', 109, true),
    (2, 'Animals', 'Sound of animals', 'The forest came alive with the sounds of animals - birds chirping, squirrels chattering, and somewhere in the distance, a wolf howling at the moon.', 110, true),
    
    -- Category 3: Voice Modulations
    (3, 'Whisper', 'Soft spoken voice', 'She leaned in close and whispered the secret in his ear, her voice barely audible above the gentle hum of the crowded restaurant.', 201, true),
    (3, 'Shout', 'Loud voice', 'He shouted her name across the crowded platform, his voice cutting through the noise of the busy train station as he waved frantically.', 202, true),
    (3, 'Monotone', 'Flat voice', 'The professor droned on in a monotone voice, reading directly from his notes without any variation in pitch or enthusiasm.', 203, true),
    (3, 'Melodic', 'Musical voice', 'Her melodic voice filled the concert hall, each note perfectly pitched and flowing like honey to the enraptured audience.', 204, true),
    (3, 'Raspy', 'Rough voice', 'His raspy voice betrayed years of smoking as he told stories of his adventures, each word grinding out like sandpaper on wood.', 205, true),
    (3, 'Squeaky', 'High-pitched voice', 'The nervous teenager''s voice came out in a squeaky pitch when he asked his crush to the dance, much to his embarrassment.', 206, true),
    (3, 'Deep', 'Low voice', 'His deep voice resonated through the auditorium, commanding attention and respect from everyone who heard him speak.', 207, true),
    (3, 'Nasal', 'Through the nose', 'She spoke with a distinct nasal quality, as if she had a permanent cold, making some words difficult to understand.', 208, true),
    (3, 'Breathless', 'Out of breath', 'She spoke in a breathless rush, trying to explain everything that had happened before anyone could interrupt with questions.', 209, true),
    (3, 'Stutter', 'Halting speech', 'He struggled with a stutter when nervous, repeating sounds and pausing mid-word as he tried to express his thoughts clearly.', 210, true)
ON CONFLICT DO NOTHING;