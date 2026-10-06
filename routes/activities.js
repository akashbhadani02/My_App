const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const auth = require('../middleware/subscriptionAuth');
const User = require('../models/User');
const { registerViolation } = require('../services/antiCheat');

const ACTIVITIES = {
  arrange: {
    title: 'Arrange Sentence', reward: 0.10, dailyLimit: 30,
    questions: [
      ['school / I / every / go / day / to','I go to school every day.'],
    ['is / my / this / book','This is my book.'],
    ['playing / children / are / football','Children are playing football.'],
    ['she / English / speaks / well','She speaks English well.'],
    ['morning / I / tea / drink / every','I drink tea every morning.'],
    ['you / where / do / live','Where do you live?'],
    ['he / a / doctor / is','He is a doctor.'],
    ['likes / music / she','She likes music.'],
    ['today / is / Monday','Today is Monday.'],
    ['have / I / two / brothers','I have two brothers.'],
    ['can / swim / he','He can swim.'],
    ['market / went / we / to / the','We went to the market.'],
    ['your / what / name / is','What is your name?'],
    ['homework / finished / I / my','I finished my homework.'],
    ['very / this / easy / is','This is very easy.'],
    ['likes / Ravi / cricket','Ravi likes cricket.'],
    ['English / learning / am / I','I am learning English.'],
    ['door / please / close / the','Please close the door.'],
    ['happy / today / I / am','I am happy today.'],
    ['coffee / does / she / drink','Does she drink coffee?'],
    ['every / walks / morning / he','He walks every morning.'],
    ['is / my / teacher / she','She is my teacher.'],
    ['football / they / play / every / Sunday','They play football every Sunday.'],
    ['a / new / car / has / he','He has a new car.'],
    ['like / I / mangoes','I like mangoes.'],
    ['time / what / is / it','What time is it?'],
    ['my / this / house / is','This is my house.'],
    ['school / to / goes / she / daily','She goes to school daily.'],
    ['reading / book / a / he / is','He is reading a book.'],
    ['are / where / my / shoes','Where are my shoes?'],
    ['name / her / is / Priya','Her name is Priya.'],
    ['very / today / busy / am / I','I am very busy today.'],
    ['the / open / window / please','Please open the window.'],
    ['food / likes / Indian / he','He likes Indian food.'],
    ['playing / garden / children / are / in / the','Children are playing in the garden.'],
    ['English / speak / can / you','Can you speak English?'],
    ['father / my / is / a / teacher','My father is a teacher.'],
    ['at / gets / up / six / he','He gets up at six.'],
    ['milk / every / drinks / morning / she','She drinks milk every morning.'],
    ['yesterday / I / him / met','I met him yesterday.'],
    ['to / want / I / learn / English','I want to learn English.'],
    ['beautiful / is / this / flower','This flower is beautiful.'],
    ['friends / are / my / here','My friends are here.'],
    ['watch / I / TV / evening / every','I watch TV every evening.'],
    ['does / where / work / he','Where does he work?'],
    ['a / dog / has / she','She has a dog.'],
    ['today / raining / is / it','It is raining today.'],
    ['book / this / interesting / is','This book is interesting.'],
    ['school / walks / to / he','He walks to school.'],
    ['help / need / I / your','I need your help.'],
    ['mother / my / cooking / is','My mother is cooking.'],
    ['football / watching / they / are','They are watching football.'],
    ['every / exercise / day / I','I exercise every day.'],
    ['does / she / English / speak','Does she speak English?'],
    ['room / clean / my / is','My room is clean.'],
    ['new / phone / bought / I / a','I bought a new phone.'],
    ['Sunday / on / visit / we / grandmother / our','We visit our grandmother on Sunday.'],
    ['very / he / is / intelligent','He is very intelligent.'],
    ['morning / newspaper / reads / father / my / the','My father reads the newspaper in the morning.'],
    ['to / going / are / we / market / the','We are going to the market.'],
    ['favorite / what / your / is / color','What is your favorite color?'],
    ['blue / favorite / my / is / color','My favorite color is blue.'],
    ['home / came / late / he','He came home late.'],
    ['beautiful / has / she / a / dress','She has a beautiful dress.'],
    ['water / drink / please / some','Please drink some water.'],
    ['English / every / practice / I / day','I practice English every day.'],
    ['brother / my / cricket / plays','My brother plays cricket.'],
    ['is / where / station / the','Where is the station?'],
    ['bus / by / school / go / I / to','I go to school by bus.'],
    ['dinner / cooking / mother / is / my','My mother is cooking dinner.'],
    ['yesterday / went / cinema / we / to / the','We went to the cinema yesterday.'],
    ['morning / beautiful / is / the','The morning is beautiful.'],
    ['does / what / your / father / do','What does your father do?'],
    ['doctor / my / father / is / a','My father is a doctor.'],
    ['very / likes / she / flowers / much','She likes flowers very much.'],
    ['computer / using / am / I / a','I am using a computer.'],
    ['homework / doing / he / is / his','He is doing his homework.'],
    ['friends / with / playing / I / am / my','I am playing with my friends.'],
    ['school / starts / at / eight','School starts at eight.'],
    ['lunch / having / they / are','They are having lunch.'],
    ['name / what / is / your','What is your name?'],
    ['from / I / India / am','I am from India.'],
    ['English / learn / want / I / to','I want to learn English.'],
    ['very / my / family / is / big','My family is very big.'],
    ['sister / my / doctor / is / a','My sister is a doctor.'],
    ['morning / walks / she / every','She walks every morning.'],
    ['cricket / likes / playing / Rahul','Rahul likes playing cricket.'],
    ['you / are / how','How are you?'],
    ['fine / I / am / thank / you','I am fine, thank you.'],
    ['tomorrow / school / go / will / I / to','I will go to school tomorrow.'],
    ['today / weather / the / nice / is','The weather is nice today.'],
    ['friend / my / very / is / helpful','My friend is very helpful.'],
    ['read / books / I / every / week','I read books every week.'],
    ['morning / breakfast / eats / he / every','He eats breakfast every morning.'],
    ['home / she / at / is','She is at home.'],
    ['playing / boys / cricket / are','Boys are playing cricket.'],
    ['water / bottle / my / is / this','This is my water bottle.'],
    ['open / door / the / can / you','Can you open the door?'],
    ['English / very / speaks / she / well','She speaks English very well.'],
    ['happy / makes / music / me','Music makes me happy.']
    ]
  },
  correction: {
    title: 'Fix the Sentence', reward: 0.15, dailyLimit: 30,
    questions: [
      ['He go to school every day.','He goes to school every day.'],
    ['She are my friend.','She is my friend.'],
    ['I has a car.','I have a car.'],
    ['They is playing cricket.','They are playing cricket.'],
    ['He do not like tea.','He does not like tea.'],
    ['She have two brothers.','She has two brothers.'],
    ['I am go to market.','I am going to the market.'],
    ['We was happy.','We were happy.'],
    ['He can sings well.','He can sing well.'],
    ['She don’t likes coffee.','She doesn’t like coffee.'],
    ['I seen him yesterday.','I saw him yesterday.'],
    ['There is many books.','There are many books.'],
    ['He is an honest man.','He is an honest man.'],
    ['I have went there.','I have gone there.'],
    ['She speak English very good.','She speaks English very well.'],
    ['Where you are going?','Where are you going?'],
    ['He have finished his work.','He has finished his work.'],
    ['My friends is here.','My friends are here.'],
    ['I did not went there.','I did not go there.'],
    ['She can to drive.','She can drive.'],
    ['He play football every Sunday.','He plays football every Sunday.'],
    ['She go to work by bus.','She goes to work by bus.'],
    ['I am a student of English.','I am an English student.'],
    ['They was at home yesterday.','They were at home yesterday.'],
    ['We has a new teacher.','We have a new teacher.'],
    ['My brother like cricket.','My brother likes cricket.'],
    ['The children is playing outside.','The children are playing outside.'],
    ['He don’t know the answer.','He doesn’t know the answer.'],
    ['She do her homework every day.','She does her homework every day.'],
    ['I goes to school daily.','I go to school daily.'],
    ['He have a new phone.','He has a new phone.'],
    ['She are cooking dinner.','She is cooking dinner.'],
    ['We is ready now.','We are ready now.'],
    ['They has two cars.','They have two cars.'],
    ['I does my work every day.','I do my work every day.'],
    ['You is very kind.','You are very kind.'],
    ['It are raining today.','It is raining today.'],
    ['He were sick yesterday.','He was sick yesterday.'],
    ['She were happy yesterday.','She was happy yesterday.'],
    ['I were busy yesterday.','I was busy yesterday.'],
    ['He can speaks English.','He can speak English.'],
    ['She can sings very well.','She can sing very well.'],
    ['They can to swim.','They can swim.'],
    ['I can to help you.','I can help you.'],
    ['He must to go now.','He must go now.'],
    ['You should to study more.','You should study more.'],
    ['She will goes tomorrow.','She will go tomorrow.'],
    ['I will to call you later.','I will call you later.'],
    ['They will comes soon.','They will come soon.'],
    ['He may goes there.','He may go there.'],
    ['I am learning English every day.','I learn English every day.'],
    ['She is go to school now.','She is going to school now.'],
    ['They are play cricket now.','They are playing cricket now.'],
    ['He is reading a book.','He is reading a book.'],
    ['We are learn English.','We are learning English.'],
    ['I am write a letter.','I am writing a letter.'],
    ['She is cook dinner.','She is cooking dinner.'],
    ['He is watch TV.','He is watching TV.'],
    ['They are study English.','They are studying English.'],
    ['You are speak too fast.','You are speaking too fast.'],
    ['I have see this movie.','I have seen this movie.'],
    ['She has finish her work.','She has finished her work.'],
    ['They have went home.','They have gone home.'],
    ['He has eat breakfast.','He has eaten breakfast.'],
    ['We have saw him before.','We have seen him before.'],
    ['I have complete my homework.','I have completed my homework.'],
    ['She has write a letter.','She has written a letter.'],
    ['He has take my book.','He has taken my book.'],
    ['They have buy a new car.','They have bought a new car.'],
    ['We have make a mistake.','We have made a mistake.'],
    ['I did not saw him.','I did not see him.'],
    ['She did not went to school.','She did not go to school.'],
    ['He did not ate breakfast.','He did not eat breakfast.'],
    ['They did not played cricket.','They did not play cricket.'],
    ['We did not watched the movie.','We did not watch the movie.'],
    ['I did not knew the answer.','I did not know the answer.'],
    ['She did not came yesterday.','She did not come yesterday.'],
    ['He did not finished his work.','He did not finish his work.'],
    ['They did not bought anything.','They did not buy anything.'],
    ['I did not understood the question.','I did not understand the question.'],
    ['Where you live?','Where do you live?'],
    ['What you are doing?','What are you doing?'],
    ['Where he works?','Where does he work?'],
    ['What she likes?','What does she like?'],
    ['Why you are late?','Why are you late?'],
    ['When he will come?','When will he come?'],
    ['Where they went yesterday?','Where did they go yesterday?'],
    ['What does he wants?','What does he want?'],
    ['Why she is crying?','Why is she crying?'],
    ['How you are feeling?','How are you feeling?'],
    ['She don’t like tea.','She doesn’t like tea.'],
    ['He don’t play cricket.','He doesn’t play cricket.'],
    ['I doesn’t understand.','I don’t understand.'],
    ['They doesn’t work here.','They don’t work here.'],
    ['We doesn’t have money.','We don’t have money.'],
    ['He don’t goes to school.','He doesn’t go to school.'],
    ['She don’t speaks English.','She doesn’t speak English.'],
    ['I don’t likes coffee.','I don’t like coffee.'],
    ['They don’t plays football.','They don’t play football.'],
    ['He doesn’t knows me.','He doesn’t know me.'],
    ['There is two students in the class.','There are two students in the class.'],
    ['There are a book on the table.','There is a book on the table.'],
    ['There is many people here.','There are many people here.'],
    ['There are one apple in the basket.','There is one apple in the basket.'],
    ['There is five chairs in the room.','There are five chairs in the room.'],
    ['There are a dog outside.','There is a dog outside.'],
    ['There is some books on the desk.','There are some books on the desk.'],
    ['There are an orange on the table.','There is an orange on the table.'],
    ['There is three cars outside.','There are three cars outside.'],
    ['There are one student in the room.','There is one student in the room.']

    ]
  },
  translate: {
    title: 'Translate to English', reward: 0.15, dailyLimit: 30,
    questions: [
      ['હું દરરોજ અંગ્રેજી શીખું છું.','I learn English every day.'],
    ['મારું નામ રાહુલ છે.','My name is Rahul.'],
    ['તે શાળાએ જાય છે.','He goes to school.'],
    ['મને ચા ગમે છે.','I like tea.'],
    ['તમે ક્યાં રહો છો?','Where do you live?'],
    ['હું આજે વ્યસ્ત છું.','I am busy today.'],
    ['તે મારી બહેન છે.','She is my sister.'],
    ['મારે એક પુસ્તક છે.','I have a book.'],
    ['તમે શું કરી રહ્યા છો?','What are you doing?'],
    ['મને અંગ્રેજી બોલવું છે.','I want to speak English.'],
    ['તે ક્રિકેટ રમી રહ્યો છે.','He is playing cricket.'],
    ['હું સવારે વહેલો ઊઠું છું.','I wake up early in the morning.'],
    ['આ બહુ સરળ છે.','This is very easy.'],
    ['મને મદદ જોઈએ છે.','I need help.'],
    ['તેણી સારી રીતે ગાય છે.','She sings well.'],
    ['અમે બજારમાં ગયા હતા.','We went to the market.'],
    ['શું તમે અંગ્રેજી સમજો છો?','Do you understand English?'],
    ['હું મારા મિત્ર સાથે વાત કરું છું.','I talk to my friend.'],
    ['આ મારું ઘર છે.','This is my house.'],
    ['કાલે હું શાળાએ જઈશ.','I will go to school tomorrow.'],
    ['મારા પિતા શિક્ષક છે.','My father is a teacher.'],
    ['મારી માતા રસોઈ બનાવે છે.','My mother cooks food.'],
    ['મને ક્રિકેટ રમવું ગમે છે.','I like playing cricket.'],
    ['તે દરરોજ દોડે છે.','He runs every day.'],
    ['તે સુંદર ગીત ગાય છે.','She sings a beautiful song.'],
    ['અમે દર રવિવારે બજારમાં જઈએ છીએ.','We go to the market every Sunday.'],
    ['મારો ભાઈ એક વિદ્યાર્થી છે.','My brother is a student.'],
    ['મારી બહેન અંગ્રેજી શીખે છે.','My sister learns English.'],
    ['તમે ખૂબ સરસ બોલો છો.','You speak very well.'],
    ['મને પાણી જોઈએ છે.','I need water.'],
    ['હું અત્યારે પુસ્તક વાંચી રહ્યો છું.','I am reading a book now.'],
    ['તે ટીવી જોઈ રહી છે.','She is watching TV.'],
    ['બાળકો મેદાનમાં રમી રહ્યા છે.','The children are playing in the ground.'],
    ['અમે અંગ્રેજી શીખી રહ્યા છીએ.','We are learning English.'],
    ['તે અત્યારે કામ કરી રહ્યો છે.','He is working now.'],
    ['તમે ક્યાં જઈ રહ્યા છો?','Where are you going?'],
    ['હું ઘરે જઈ રહ્યો છું.','I am going home.'],
    ['તે રસોઈ બનાવી રહી છે.','She is cooking.'],
    ['તેઓ ક્રિકેટ રમી રહ્યા છે.','They are playing cricket.'],
    ['હું મારા મિત્રની રાહ જોઈ રહ્યો છું.','I am waiting for my friend.'],
    ['ગઈકાલે હું શાળાએ ગયો હતો.','I went to school yesterday.'],
    ['તેણે મને ફોન કર્યો હતો.','He called me.'],
    ['અમે ગઈકાલે ફિલ્મ જોઈ હતી.','We watched a movie yesterday.'],
    ['તેણીએ પોતાનું કામ પૂરું કર્યું.','She finished her work.'],
    ['મેં ગઈકાલે એક પુસ્તક ખરીદ્યું.','I bought a book yesterday.'],
    ['તેઓ બજારમાં ગયા હતા.','They went to the market.'],
    ['મારો મિત્ર ગઈકાલે આવ્યો હતો.','My friend came yesterday.'],
    ['મેં તેને ગઈકાલે જોયો હતો.','I saw him yesterday.'],
    ['અમે ગઈકાલે ખૂબ ખુશ હતા.','We were very happy yesterday.'],
    ['તેણે મને મદદ કરી હતી.','He helped me.'],
    ['હું કાલે બજારમાં જઈશ.','I will go to the market tomorrow.'],
    ['તે કાલે આવશે.','He will come tomorrow.'],
    ['અમે આવતા અઠવાડિયે પ્રવાસ કરીશું.','We will travel next week.'],
    ['હું તમને પછીથી ફોન કરીશ.','I will call you later.'],
    ['તે કાલે પરીક્ષા આપશે.','She will take the exam tomorrow.'],
    ['તેઓ સાંજે આવશે.','They will come in the evening.'],
    ['હું તમને મદદ કરીશ.','I will help you.'],
    ['અમે કાલે ક્રિકેટ રમીશું.','We will play cricket tomorrow.'],
    ['તે આવતા મહિને અમદાવાદ જશે.','He will go to Ahmedabad next month.'],
    ['હું અંગ્રેજી શીખતો રહીશ.','I will continue learning English.'],
    ['તમારું નામ શું છે?','What is your name?'],
    ['તમારી ઉંમર કેટલી છે?','How old are you?'],
    ['તમે શું કરો છો?','What do you do?'],
    ['તમારા પિતાનું નામ શું છે?','What is your father’s name?'],
    ['તમારી બહેન ક્યાં છે?','Where is your sister?'],
    ['તમે શાળાએ કેવી રીતે જાઓ છો?','How do you go to school?'],
    ['તમને કયો રંગ ગમે છે?','Which color do you like?'],
    ['તમારો મનપસંદ વિષય કયો છે?','What is your favorite subject?'],
    ['તમે ક્યારે ઊઠો છો?','When do you wake up?'],
    ['તમે અંગ્રેજી કેમ શીખો છો?','Why do you learn English?'],
    ['મને દરરોજ અંગ્રેજી બોલવાની પ્રેક્ટિસ કરવી છે.','I want to practice speaking English every day.'],
    ['મારો મિત્ર ખૂબ સારો છે.','My friend is very good.'],
    ['મારું ઘર શાળાની નજીક છે.','My house is near the school.'],
    ['મને પુસ્તકો વાંચવા ગમે છે.','I like reading books.'],
    ['તે ખૂબ મહેનતુ છોકરો છે.','He is a very hardworking boy.'],
    ['મારી માતા દરરોજ વહેલી સવારે ઊઠે છે.','My mother wakes up early every day.'],
    ['મારો ભાઈ ક્રિકેટ ખૂબ સારી રીતે રમે છે.','My brother plays cricket very well.'],
    ['મારી બહેન સુંદર ચિત્રો દોરે છે.','My sister draws beautiful pictures.'],
    ['અમે દરરોજ સાથે ભોજન કરીએ છીએ.','We eat together every day.'],
    ['મને મારા પરિવાર સાથે સમય પસાર કરવો ગમે છે.','I like spending time with my family.'],
    ['આ મારું નવું ઘર છે.','This is my new house.'],
    ['તે મારી જૂની સાયકલ છે.','That is my old bicycle.'],
    ['ટેબલ પર એક પુસ્તક છે.','There is a book on the table.'],
    ['વર્ગમાં ઘણા વિદ્યાર્થીઓ છે.','There are many students in the class.'],
    ['મારા રૂમમાં બે ખુરશીઓ છે.','There are two chairs in my room.'],
    ['બહાર ખૂબ વરસાદ પડી રહ્યો છે.','It is raining heavily outside.'],
    ['આજે હવામાન ખૂબ સારું છે.','The weather is very nice today.'],
    ['મને આ પ્રશ્નનો જવાબ ખબર છે.','I know the answer to this question.'],
    ['મને આ પ્રશ્ન સમજાતો નથી.','I do not understand this question.'],
    ['કૃપા કરીને દરવાજો બંધ કરો.','Please close the door.'],
    ['કૃપા કરીને મને થોડું પાણી આપો.','Please give me some water.'],
    ['મારી સાથે અહીં બેસો.','Sit here with me.'],
    ['મને તમારું પેન આપશો?','Will you give me your pen?'],
    ['શું તમે મને મદદ કરી શકો છો?','Can you help me?'],
    ['શું હું અંદર આવી શકું?','May I come in?'],
    ['શું તમે મારી વાત સાંભળી રહ્યા છો?','Are you listening to me?'],
    ['મને ખબર નથી.','I do not know.'],
    ['મને લાગે છે કે તે સાચું છે.','I think it is correct.'],
    ['ચિંતા કરશો નહીં.','Do not worry.'],
    ['ધીમે બોલો, કૃપા કરીને.','Please speak slowly.'],
    ['મને ભૂખ લાગી છે.','I am hungry.'],
    ['મને તરસ લાગી છે.','I am thirsty.'],
    ['હું ખૂબ થાકી ગયો છું.','I am very tired.'],
    ['આજે હું ખૂબ ખુશ છું.','I am very happy today.'],
    ['તે અત્યારે બીમાર છે.','He is sick now.'],
    ['મારી તબિયત સારી છે.','I am feeling well.'],
    ['મને અંગ્રેજી શીખવામાં આનંદ આવે છે.','I enjoy learning English.'],
    ['મને નવી વસ્તુઓ શીખવી ગમે છે.','I like learning new things.'],
    ['હું દરરોજ મારી ભૂલો સુધારું છું.','I correct my mistakes every day.'],
    ['હું અંગ્રેજીમાં વધુ સારું બોલવા માંગું છું.','I want to speak better English.']
    ]
  },
  word: {
    title: 'Word Builder', reward: 0.05, dailyLimit: 30,
    questions: [
      ['lpepa','apple'],
    ['raecahte','teacher'],
    ['ohscool','school'],
    ['fneird','friend'],
    ['hpoen','phone'],
    ['mraekt','market'],
    ['wtaer','water'],
    ['flwoer','flower'],
    ['famliy','family'],
    ['cmoeputer','computer'],
    ['hppa y','happy'],
    ['bueatiful','beautiful'],
    ['morinng','morning'],
    ['chlidren','children'],
    ['kictchen','kitchen'],
    ['hosptial','hospital'],
    ['langauge','language'],
    ['qeuestion','question'],
    ['answre','answer'],
    ['strnog','strong'],
    ['tehcar','teacher'],
    ['stduent','student'],
    ['frutis','fruits'],
    ['bananna','banana'],
    ['oragne','orange'],
    ['tabel','table'],
    ['chairr','chair'],
    ['wnidow','window'],
    ['doorr','door'],
    ['housre','house'],
    ['gardne','garden'],
    ['flwoer','flower'],
    ['trree','tree'],
    ['grases','grass'],
    ['moutnain','mountain'],
    ['rveir','river'],
    ['beahc','beach'],
    ['countrry','country'],
    ['vilalge','village'],
    ['citry','city'],
    ['famliy','family'],
    ['motther','mother'],
    ['fathre','father'],
    ['brohter','brother'],
    ['sistter','sister'],
    ['parnets','parents'],
    ['chilren','children'],
    ['grandmtoher','grandmother'],
    ['grandfathre','grandfather'],
    ['uncel','uncle'],
    ['watc h','watch'],
    ['clcok','clock'],
    ['bottel','bottle'],
    ['pencile','pencil'],
    ['notebok','notebook'],
    ['bagag','bag'],
    ['rulre','ruler'],
    ['eraser','eraser'],
    ['deskk','desk'],
    ['blacboard','blackboard'],
    ['morinng','morning'],
    ['afternon','afternoon'],
    ['evennig','evening'],
    ['nigth','night'],
    ['todday','today'],
    ['tomorow','tomorrow'],
    ['yesterdya','yesterday'],
    ['weekk','week'],
    ['mont h','month'],
    ['yeer','year'],
    ['happyy','happy'],
    ['sad d','sad'],
    ['angrry','angry'],
    ['tired d','tired'],
    ['excitt ed','excited'],
    ['hungry y','hungry'],
    ['thirstyy','thirsty'],
    ['afraid d','afraid'],
    ['bravee','brave'],
    ['kindd','kind'],
    ['strongg','strong'],
    ['cleverr','clever'],
    ['smartt','smart'],
    ['honst','honest'],
    ['helpfull','helpful'],
    ['politee','polite'],
    ['carefull','careful'],
    ['beautifull','beautiful'],
    ['importent','important'],
    ['difficul t','difficult'],
    ['enginer','engineer'],
    ['doctro','doctor'],
    ['nursse','nurse'],
    ['farme r','farmer'],
    ['driver r','driver'],
    ['policman','policeman'],
    ['artistt','artist'],
    ['singer r','singer'],
    ['playerr','player'],
    ['workerr','worker'],
    ['breakfas t','breakfast'],
    ['lunchh','lunch'],
    ['dinnerr','dinner'],
    ['vegetabel','vegetable'],
    ['potatto','potato'],
    ['tomatto','tomato'],
    ['sandwhich','sandwich'],
    ['chickenn','chicken'],
    ['milkk','milk'],
    ['coffe e','coffee']
    ]
  },
  fill: {
    title: 'Fill in the Blank', reward: 0.10, dailyLimit: 30,
    questions: [
      ['I ___ a student.',['am','is','are'],'am'],
    ['She ___ to school every day.',['go','goes','going'],'goes'],
    ['They ___ happy.',['is','am','are'],'are'],
    ['He ___ football yesterday.',['play','played','plays'],'played'],
    ['I ___ tea every morning.',['drink','drinks','drank'],'drink'],
    ['We ___ learning English.',['is','are','am'],'are'],
    ['She ___ a new phone.',['have','has','having'],'has'],
    ['You ___ very kind.',['is','are','am'],'are'],
    ['He ___ swim.',['can','cans','can to'],'can'],
    ['I ___ my homework yesterday.',['finish','finished','finishes'],'finished'],

    ['There ___ two books.',['is','are','am'],'are'],
    ['She ___ English well.',['speak','speaks','speaking'],'speaks'],
    ['I ___ going home.',['am','is','are'],'am'],
    ['They ___ cricket now.',['play','are playing','played'],'are playing'],
    ['He ___ breakfast at 8.',['eat','eats','eating'],'eats'],

    ['My father ___ a teacher.',['am','is','are'],'is'],
    ['My mother ___ food every day.',['cook','cooks','cooking'],'cooks'],
    ['We ___ friends.',['am','is','are'],'are'],
    ['Ravi ___ cricket every Sunday.',['play','plays','playing'],'plays'],
    ['She ___ a beautiful dress.',['have','has','having'],'has'],

    ['I ___ English every day.',['learn','learns','learning'],'learn'],
    ['He ___ to work by bus.',['go','goes','going'],'goes'],
    ['They ___ in Ahmedabad.',['live','lives','living'],'live'],
    ['She ___ coffee every morning.',['drink','drinks','drinking'],'drinks'],
    ['We ___ dinner at 8 PM.',['eat','eats','eating'],'eat'],

    ['I ___ very tired today.',['am','is','are'],'am'],
    ['He ___ at home now.',['am','is','are'],'is'],
    ['They ___ in the classroom.',['am','is','are'],'are'],
    ['She ___ my best friend.',['am','is','are'],'is'],
    ['You ___ very helpful.',['am','is','are'],'are'],

    ['I ___ a new book yesterday.',['buy','bought','buys'],'bought'],
    ['She ___ to the market yesterday.',['go','went','goes'],'went'],
    ['He ___ a movie last night.',['watch','watched','watches'],'watched'],
    ['We ___ cricket yesterday.',['play','played','plays'],'played'],
    ['They ___ home late.',['come','came','comes'],'came'],

    ['I ___ him yesterday.',['see','saw','seen'],'saw'],
    ['She ___ her homework.',['finish','finished','finishes'],'finished'],
    ['He ___ a new car last year.',['buy','bought','buys'],'bought'],
    ['We ___ dinner together.',['have','had','has'],'had'],
    ['They ___ the answer.',['know','knew','knows'],'knew'],

    ['I ___ go tomorrow.',['will','am','was'],'will'],
    ['She ___ come tomorrow.',['will','is','was'],'will'],
    ['We ___ visit our grandmother next week.',['will','are','were'],'will'],
    ['He ___ call you later.',['will','does','did'],'will'],
    ['They ___ play football tomorrow.',['will','are','were'],'will'],

    ['I ___ reading a book now.',['am','is','are'],'am'],
    ['She ___ cooking dinner now.',['am','is','are'],'is'],
    ['They ___ watching TV.',['am','is','are'],'are'],
    ['He ___ playing cricket.',['am','is','are'],'is'],
    ['We ___ learning English.',['am','is','are'],'are'],

    ['I ___ like coffee.',['do','does','did'],'do'],
    ['She ___ like tea.',['do','does','did'],'does'],
    ['They ___ play cricket.',['do','does','did'],'do'],
    ['He ___ not understand.',['do','does','did'],'does'],
    ['We ___ not know him.',['do','does','did'],'do'],

    ['___ you speak English?',['Do','Does','Did'],'Do'],
    ['___ she like music?',['Do','Does','Did'],'Does'],
    ['___ they go to school yesterday?',['Do','Does','Did'],'Did'],
    ['___ he play cricket?',['Do','Does','Did'],'Does'],
    ['___ you watch the movie yesterday?',['Do','Does','Did'],'Did'],

    ['There ___ a book on the table.',['is','are','am'],'is'],
    ['There ___ three students here.',['is','are','am'],'are'],
    ['There ___ an apple in the bag.',['is','are','am'],'is'],
    ['There ___ many cars outside.',['is','are','am'],'are'],
    ['There ___ a dog in the garden.',['is','are','am'],'is'],

    ['She ___ very well.',['sing','sings','singing'],'sings'],
    ['He ___ English every day.',['study','studies','studying'],'studies'],
    ['My brother ___ football.',['play','plays','playing'],'plays'],
    ['My sister ___ books.',['read','reads','reading'],'reads'],
    ['The baby ___ a lot.',['cry','cries','crying'],'cries'],

    ['I ___ my room every Sunday.',['clean','cleans','cleaning'],'clean'],
    ['He ___ his teeth every morning.',['brush','brushes','brushing'],'brushes'],
    ['She ___ breakfast at 8 AM.',['have','has','having'],'has'],
    ['We ___ to school together.',['walk','walks','walking'],'walk'],
    ['They ___ English at school.',['learn','learns','learning'],'learn'],

    ['You ___ a good student.',['am','is','are'],'are'],
    ['My friends ___ very helpful.',['is','am','are'],'are'],
    ['The dog ___ hungry.',['is','are','am'],'is'],
    ['The children ___ playing outside.',['is','am','are'],'are'],
    ['My parents ___ at home.',['is','am','are'],'are'],

    ['I ___ never seen this movie.',['have','has','had'],'have'],
    ['She ___ already finished her work.',['have','has','had'],'has'],
    ['They ___ gone to the market.',['have','has','had'],'have'],
    ['He ___ eaten breakfast.',['have','has','had'],'has'],
    ['We ___ completed the project.',['have','has','had'],'have'],

    ['I ___ help you.',['can','cans','can to'],'can'],
    ['She ___ swim very well.',['can','cans','can to'],'can'],
    ['He ___ speak English.',['can','cans','can to'],'can'],
    ['They ___ play football.',['can','cans','can to'],'can'],
    ['We ___ solve this problem.',['can','cans','can to'],'can'],

    ['You ___ study hard.',['should','should to','shoulds'],'should'],
    ['He ___ see a doctor.',['should','should to','shoulds'],'should'],
    ['We ___ help poor people.',['should','should to','shoulds'],'should'],
    ['She ___ drink more water.',['should','should to','shoulds'],'should'],
    ['They ___ arrive on time.',['should','should to','shoulds'],'should'],

    ['I ___ happy yesterday.',['was','were','am'],'was'],
    ['She ___ at school yesterday.',['was','were','is'],'was'],
    ['They ___ tired yesterday.',['was','were','are'],'were'],
    ['We ___ busy last week.',['was','were','are'],'were'],
    ['He ___ sick yesterday.',['was','were','is'],'was'],

    ['I ___ going to the market.',['am','is','are'],'am'],
    ['She ___ going home.',['am','is','are'],'is'],
    ['They ___ going to school.',['am','is','are'],'are'],
    ['He ___ going to work.',['am','is','are'],'is'],
    ['We ___ going to the park.',['am','is','are'],'are']
    ]
  },
  listening: {
    title: 'Listen & Type', reward: 0.15, dailyLimit: 30,
    questions: [
       'I am learning English.',
    'My name is Mahesh.',
    'I go to school every day.',
    'She is my best friend.',
    'What are you doing?',
    'I like to read books.',
    'Please open the door.',
    'He is playing cricket.',
    'I drink water every morning.',
    'We are going to the market.',

    'English is an important language.',
    'I want to improve my speaking.',
    'Today is a beautiful day.',
    'Can you help me please?',
    'I finished my homework.',
    'My father is a teacher.',
    'My mother cooks delicious food.',
    'I have two brothers.',
    'She goes to school every morning.',
    'He likes playing football.',

    'I wake up early every day.',
    'We live in a small village.',
    'My friend lives near my house.',
    'I like drinking tea.',
    'She speaks English very well.',
    'They are playing in the garden.',
    'The children are very happy.',
    'Please close the window.',
    'Where do you live?',
    'What is your name?',

    'I am very busy today.',
    'He is reading a new book.',
    'She is cooking dinner.',
    'We are learning English together.',
    'They are watching television.',
    'I go to the market on Sunday.',
    'My brother plays cricket.',
    'My sister likes music.',
    'The weather is very nice today.',
    'I want to learn new words.',

    'Please give me some water.',
    'Can you speak English?',
    'Do you understand this question?',
    'I need your help.',
    'Please speak slowly.',
    'I am waiting for my friend.',
    'He works in a hospital.',
    'She is a good teacher.',
    'My school is near my house.',
    'I walk to school every day.',

    'Yesterday I went to the market.',
    'I watched a movie last night.',
    'She visited her grandmother yesterday.',
    'He finished his work in the evening.',
    'We played cricket yesterday.',
    'They went to school in the morning.',
    'I bought a new phone yesterday.',
    'My friend called me yesterday.',
    'She cooked dinner for her family.',
    'He helped me with my homework.',

    'I will go to school tomorrow.',
    'She will come here tomorrow.',
    'We will visit the market tomorrow.',
    'He will call you later.',
    'They will play cricket tomorrow.',
    'I will help you with your work.',
    'She will learn English next year.',
    'We will meet again tomorrow.',
    'He will buy a new book.',
    'They will come in the evening.',

    'I am happy to see you.',
    'She is very kind and helpful.',
    'He is my best friend.',
    'My family is very important to me.',
    'I love spending time with my family.',
    'Reading books is my favorite hobby.',
    'I like listening to English songs.',
    'My favorite sport is cricket.',
    'I enjoy learning English.',
    'I practice English every day.',

    'There is a book on the table.',
    'There are two chairs in the room.',
    'There is a dog in the garden.',
    'There are many students in the class.',
    'My room is clean and beautiful.',
    'The door is open.',
    'The window is closed.',
    'My phone is on the table.',
    'The children are in the classroom.',
    'My parents are at home.',

    'What time do you wake up?',
    'What is your favorite food?',
    'Where is your school?',
    'Who is your best friend?',
    'Why are you learning English?',
    'When do you go to school?',
    'How do you go to work?',
    'What are you doing now?',
    'Can you help me with this?',
    'Do you like English?',
    
    'I want to speak English confidently.',
    'I am trying to improve my English.',
    'English is easy when you practice every day.',
    'I learn something new every day.',
    'Never be afraid of making mistakes.',
    'Practice makes you better.',
    'I will keep learning English.',
    'I believe I can speak English well.',
    'I am proud of my progress.',
    'I will never give up learning English.'
    ]
  },
  reading: {
    title: 'Reading Challenge', reward: 0.15, dailyLimit: 30,
    questions: [
      ['Riya wakes up at 6 o’clock every morning. She brushes her teeth and goes for a walk.',
     'When does Riya wake up?',
     ['At 6 o’clock','At 8 o’clock','At 10 o’clock'],
     'At 6 o’clock'],

    ['Amit likes reading books. He reads for thirty minutes every evening.',
     'What does Amit like?',
     ['Reading books','Playing football','Watching movies'],
     'Reading books'],

    ['John has a small dog named Bruno. Bruno likes to play in the garden.',
     'What is the dog’s name?',
     ['Bruno','John','Tom'],
     'Bruno'],

    ['Meena goes to the market on Sunday. She buys vegetables and fruit.',
     'When does Meena go to the market?',
     ['Sunday','Monday','Friday'],
     'Sunday'],

    ['Raj studies English every day because he wants to speak confidently.',
     'Why does Raj study English?',
     ['To speak confidently','To play games','To sleep'],
     'To speak confidently'],

    ['Neha has a blue bicycle. She rides it to school every morning.',
     'What color is Neha’s bicycle?',
     ['Blue','Red','Green'],
     'Blue'],

    ['Rahul lives in Ahmedabad with his parents. He works in a small office.',
     'Where does Rahul live?',
     ['Ahmedabad','Mumbai','Delhi'],
     'Ahmedabad'],

    ['Maya likes flowers. Her favorite flower is the rose.',
     'What is Maya’s favorite flower?',
     ['Rose','Lotus','Sunflower'],
     'Rose'],

    ['Arjun plays cricket every evening with his friends in the park.',
     'When does Arjun play cricket?',
     ['Every evening','Every morning','Every night'],
     'Every evening'],

    ['Sara has two brothers and one sister. They all live together.',
     'How many brothers does Sara have?',
     ['Two','One','Three'],
     'Two'],

    ['Karan drinks milk every morning before going to school.',
     'What does Karan drink in the morning?',
     ['Milk','Tea','Juice'],
     'Milk'],

    ['Priya is a teacher. She teaches English to young students.',
     'What does Priya teach?',
     ['English','Maths','Science'],
     'English'],

    ['Vijay bought a new phone yesterday. The phone is black.',
     'What color is Vijay’s new phone?',
     ['Black','White','Blue'],
     'Black'],

    ['Anita goes for a walk every morning. She usually walks for thirty minutes.',
     'How long does Anita walk?',
     ['Thirty minutes','One hour','Ten minutes'],
     'Thirty minutes'],

    ['Rohan likes football. He watches football matches on television every weekend.',
     'What sport does Rohan like?',
     ['Football','Cricket','Tennis'],
     'Football'],

    ['Pooja has a cat named Kitty. Kitty likes sleeping on the sofa.',
     'What is the cat’s name?',
     ['Kitty','Pooja','Mimi'],
     'Kitty'],

    ['Dev wakes up early because he has to catch the school bus at seven o’clock.',
     'Why does Dev wake up early?',
     ['To catch the school bus','To play cricket','To watch TV'],
     'To catch the school bus'],

    ['Nisha loves cooking. She makes delicious food for her family every Sunday.',
     'What does Nisha love?',
     ['Cooking','Dancing','Singing'],
     'Cooking'],

    ['Aman has a small garden behind his house. He grows tomatoes and flowers there.',
     'What does Aman grow?',
     ['Tomatoes and flowers','Rice and wheat','Apples and mangoes'],
     'Tomatoes and flowers'],

    ['Mehul goes to the library every Saturday. He borrows two books each time.',
     'When does Mehul go to the library?',
     ['Saturday','Sunday','Monday'],
     'Saturday'],

    ['Ravi is very hardworking. He studies for two hours every evening.',
     'How long does Ravi study every evening?',
     ['Two hours','One hour','Three hours'],
     'Two hours'],

    ['Kavya likes music. She listens to English songs before going to bed.',
     'What does Kavya listen to?',
     ['English songs','News','Stories'],
     'English songs'],

    ['Harsh has a red school bag. He keeps his books and notebooks inside it.',
     'What color is Harsh’s school bag?',
     ['Red','Blue','Black'],
     'Red'],

    ['Isha visits her grandmother every weekend. Her grandmother lives in a nearby village.',
     'Who does Isha visit every weekend?',
     ['Her grandmother','Her teacher','Her friend'],
     'Her grandmother'],

    ['Manav loves animals. He wants to become a veterinarian when he grows up.',
     'What does Manav want to become?',
     ['A veterinarian','A teacher','A driver'],
     'A veterinarian'],

    ['Sonal wakes up at seven and has breakfast before going to work.',
     'When does Sonal have breakfast?',
     ['Before going to work','After going to work','At night'],
     'Before going to work'],

    ['Yash bought three apples and two bananas from the market.',
     'How many apples did Yash buy?',
     ['Three','Two','Five'],
     'Three'],

    ['Komal is learning English because she wants to work in another country.',
     'Why is Komal learning English?',
     ['To work in another country','To play games','To watch movies'],
     'To work in another country'],

    ['A school bus arrives at eight o’clock every morning. The students wait near the gate.',
     'When does the school bus arrive?',
     ['At eight o’clock','At seven o’clock','At nine o’clock'],
     'At eight o’clock'],

    ['Milan has a pet parrot named Mithu. Mithu can say a few words.',
     'What is the parrot’s name?',
     ['Mithu','Milan','Raju'],
     'Mithu'],

    ['Rina likes painting. She paints pictures of flowers, trees, and mountains.',
     'What does Rina like?',
     ['Painting','Dancing','Cooking'],
     'Painting'],

    ['Jay works at a hospital. He helps doctors and takes care of patients.',
     'Where does Jay work?',
     ['At a hospital','At a school','At a bank'],
     'At a hospital'],

    ['Tina drinks a glass of water after waking up every morning.',
     'What does Tina drink after waking up?',
     ['Water','Milk','Juice'],
     'Water'],

    ['Nitin has a blue car. He drives it to work every day.',
     'What color is Nitin’s car?',
     ['Blue','Black','White'],
     'Blue'],

    ['Asha enjoys gardening. She plants new flowers in her garden every month.',
     'What does Asha enjoy?',
     ['Gardening','Reading','Swimming'],
     'Gardening'],

    ['Rakesh went to the beach with his family last Sunday. They played in the sand.',
     'Where did Rakesh go?',
     ['To the beach','To the park','To the market'],
     'To the beach'],

    ['Divya studies at night because her house is quiet after dinner.',
     'Why does Divya study at night?',
     ['Because her house is quiet','Because she likes sleeping','Because school is closed'],
     'Because her house is quiet'],

    ['A small bird built a nest in the tree near Ravi’s house.',
     'Where did the bird build its nest?',
     ['In a tree','On a roof','In a box'],
     'In a tree'],

    ['Sahil bought a new pair of shoes because his old shoes were damaged.',
     'Why did Sahil buy new shoes?',
     ['His old shoes were damaged','He lost his bag','He wanted a bicycle'],
     'His old shoes were damaged'],

    ['Mira goes to the gym three times a week. She exercises for one hour each time.',
     'How often does Mira go to the gym?',
     ['Three times a week','Every day','Once a month'],
     'Three times a week'],

    ['Vishal loves mangoes. During summer, he eats them almost every day.',
     'What fruit does Vishal love?',
     ['Mangoes','Apples','Oranges'],
     'Mangoes'],

    ['Reema has a beautiful dress for her sister’s wedding. The dress is pink.',
     'What color is Reema’s dress?',
     ['Pink','Yellow','Green'],
     'Pink'],

    ['A boy named Sam helps his mother clean the house every Saturday.',
     'When does Sam help his mother?',
     ['Every Saturday','Every Monday','Every Sunday'],
     'Every Saturday'],

    ['Lalit is learning to drive. He practices with his father every evening.',
     'Who practices driving with Lalit?',
     ['His father','His brother','His friend'],
     'His father'],

    ['The train leaves the station at nine in the morning. Many passengers are waiting.',
     'When does the train leave?',
     ['At nine in the morning','At ten at night','At eight in the evening'],
     'At nine in the morning'],

    ['A family went to the zoo on Sunday. They saw lions, elephants, and monkeys.',
     'Where did the family go?',
     ['To the zoo','To the museum','To the beach'],
     'To the zoo'],

    ['Ritu likes chocolate ice cream. She usually eats it after dinner.',
     'What flavor of ice cream does Ritu like?',
     ['Chocolate','Vanilla','Mango'],
     'Chocolate'],

    ['Mohan has a small shop near the bus station. He sells books and stationery.',
     'What does Mohan sell?',
     ['Books and stationery','Clothes and shoes','Vegetables and fruit'],
     'Books and stationery'],

    ['Aarti is preparing for her English exam. She studies grammar and vocabulary every day.',
     'What is Aarti preparing for?',
     ['An English exam','A music exam','A driving test'],
     'An English exam'],

    ['The children went to the park after school. They played on the swings.',
     'Where did the children go?',
     ['To the park','To the library','To the hospital'],
     'To the park'],

    ['Vivek likes swimming. He goes to the swimming pool every Wednesday.',
     'When does Vivek go swimming?',
     ['Wednesday','Friday','Sunday'],
     'Wednesday'],

    ['Sita keeps her important documents in a drawer in her bedroom.',
     'Where does Sita keep her documents?',
     ['In a drawer','In a bag','Under the bed'],
     'In a drawer'],

    ['A farmer works in his field from early morning until afternoon.',
     'Where does the farmer work?',
     ['In his field','In an office','In a shop'],
     'In his field'],

    ['Neeraj bought a birthday gift for his best friend. He bought a watch.',
     'What did Neeraj buy?',
     ['A watch','A phone','A book'],
     'A watch'],

    ['The teacher gave the students homework on Monday. They had to finish it by Friday.',
     'When did the teacher give the homework?',
     ['Monday','Friday','Sunday'],
     'Monday'],

    ['Mansi enjoys watching movies with her family on Saturday nights.',
     'When does Mansi watch movies?',
     ['Saturday nights','Sunday mornings','Monday afternoons'],
     'Saturday nights'],

    ['A young boy found a lost wallet near the school gate. He gave it to his teacher.',
     'Where did the boy find the wallet?',
     ['Near the school gate','In the classroom','At home'],
     'Near the school gate'],

    ['Kishan goes jogging every morning before breakfast.',
     'When does Kishan go jogging?',
     ['Before breakfast','After dinner','At midnight'],
     'Before breakfast'],

    ['The shop opens at ten in the morning and closes at eight in the evening.',
     'When does the shop open?',
     ['At ten in the morning','At eight in the morning','At nine at night'],
     'At ten in the morning'],

    ['Pinal has a small notebook. She writes new English words in it every day.',
     'What does Pinal write in her notebook?',
     ['New English words','Stories','Phone numbers'],
     'New English words'],

    ['Amit’s favorite subject at school is science. He wants to become a scientist.',
     'What is Amit’s favorite subject?',
     ['Science','English','History'],
     'Science'],

    ['Rupal went shopping with her mother and bought a new pair of shoes.',
     'Who went shopping with Rupal?',
     ['Her mother','Her sister','Her friend'],
     'Her mother'],

    ['The family had dinner together at seven o’clock in the evening.',
     'When did the family have dinner?',
     ['At seven o’clock','At six o’clock','At nine o’clock'],
     'At seven o’clock'],

    ['A boy named Rohit loves drawing. He draws pictures in his notebook after school.',
     'What does Rohit love?',
     ['Drawing','Swimming','Reading'],
     'Drawing'],

    ['Sneha has an English class every Tuesday and Thursday.',
     'On which days does Sneha have English class?',
     ['Tuesday and Thursday','Monday and Friday','Wednesday and Saturday'],
     'Tuesday and Thursday'],

    ['A man was waiting for a bus when he saw his old friend across the street.',
     'What was the man waiting for?',
     ['A bus','A train','A taxi'],
     'A bus'],

    ['Pooja cleaned her room because her friends were coming to visit her.',
     'Why did Pooja clean her room?',
     ['Her friends were coming','She was going to school','She wanted to sleep'],
     'Her friends were coming'],

    ['The library is closed on Sunday, so Rahul visits it on Saturday.',
     'Why does Rahul visit the library on Saturday?',
     ['The library is closed on Sunday','He has school on Sunday','He works there'],
     'The library is closed on Sunday'],

    ['A farmer has ten cows and five goats on his farm.',
     'How many cows does the farmer have?',
     ['Ten','Five','Fifteen'],
     'Ten'],

    ['Meena bought vegetables, fruits, and milk from the supermarket.',
     'Where did Meena buy the food?',
     ['Supermarket','School','Hospital'],
     'Supermarket'],

    ['A young girl named Tara loves reading storybooks before going to bed.',
     'When does Tara read storybooks?',
     ['Before going to bed','Before breakfast','At school'],
     'Before going to bed'],

    ['Rajesh works from Monday to Friday and rests on Saturday and Sunday.',
     'When does Rajesh rest?',
     ['Saturday and Sunday','Monday and Tuesday','Wednesday and Thursday'],
     'Saturday and Sunday'],

    ['Kiran has a small computer on his desk. He uses it for studying English.',
     'Why does Kiran use the computer?',
     ['For studying English','For playing cricket','For cooking'],
     'For studying English'],

    ['A woman named Lata grows vegetables in her backyard. She grows tomatoes and potatoes.',
     'What vegetables does Lata grow?',
     ['Tomatoes and potatoes','Carrots and onions','Beans and peas'],
     'Tomatoes and potatoes'],

    ['The students listened carefully while the teacher explained the lesson.',
     'Who explained the lesson?',
     ['The teacher','The students','The principal'],
     'The teacher'],

    ['Arun forgot his umbrella, so he got wet while walking home in the rain.',
     'Why did Arun get wet?',
     ['He forgot his umbrella','He went swimming','He washed his clothes'],
     'He forgot his umbrella'],

    ['A family has a large dog named Max. Max sleeps outside the house at night.',
     'Where does Max sleep?',
     ['Outside the house','In the kitchen','In the car'],
     'Outside the house'],

    ['Naina practices speaking English with her friend every evening.',
     'Who does Naina practice English with?',
     ['Her friend','Her teacher','Her brother'],
     'Her friend'],

    ['The bus was late because there was heavy traffic on the road.',
     'Why was the bus late?',
     ['Because of heavy traffic','Because of rain','Because of an accident'],
     'Because of heavy traffic'],

    ['Suresh saves some money every month because he wants to buy a new laptop.',
     'Why does Suresh save money?',
     ['To buy a new laptop','To buy a bicycle','To travel abroad'],
     'To buy a new laptop'],

    ['A girl named Rani has a beautiful garden. She waters the plants every morning.',
     'When does Rani water the plants?',
     ['Every morning','Every evening','Every Sunday'],
     'Every morning'],

    ['The students went to the museum to learn about history.',
     'Why did the students go to the museum?',
     ['To learn about history','To play games','To buy books'],
     'To learn about history'],

    ['A man named Deepak rides his bicycle to work because his office is close to his home.',
     'Why does Deepak ride his bicycle to work?',
     ['His office is close to his home','He does not have a car','He likes buses'],
     'His office is close to his home'],

    ['Kajal drinks warm milk before sleeping every night.',
     'What does Kajal drink before sleeping?',
     ['Warm milk','Cold water','Tea'],
     'Warm milk'],

    ['A boy named Amar wants to improve his English, so he reads English newspapers every morning.',
     'What does Amar read?',
     ['English newspapers','Storybooks','Magazines'],
     'English newspapers'],

    ['The family visited a hill station during their summer vacation. They enjoyed the cool weather.',
     'When did the family visit the hill station?',
     ['During summer vacation','During winter','During the rainy season'],
     'During summer vacation'],

    ['Ramesh keeps his bicycle in the garage when he is not using it.',
     'Where does Ramesh keep his bicycle?',
     ['In the garage','In the garden','In his bedroom'],
     'In the garage'],

    ['A teacher asked the students to write five sentences in English.',
     'What did the teacher ask the students to write?',
     ['Five English sentences','A story','A letter'],
     'Five English sentences'],

    ['Mitali goes to bed at ten o’clock because she wakes up early for school.',
     'Why does Mitali go to bed at ten?',
     ['She wakes up early for school','She is tired from work','She has dinner late'],
     'She wakes up early for school'],

    ['A boy named Kunal found a small puppy in the street and took it home.',
     'What did Kunal find?',
     ['A small puppy','A kitten','A bird'],
     'A small puppy'],

    ['Riya’s family celebrates her birthday every year with a small party at home.',
     'How does Riya’s family celebrate her birthday?',
     ['With a small party at home','With a trip','At a restaurant'],
     'With a small party at home'],

    ['Anil wants to become a doctor because he likes helping sick people.',
     'Why does Anil want to become a doctor?',
     ['He likes helping sick people','He likes teaching','He likes driving'],
     'He likes helping sick people'],

    ['The girl opened the window because the room was very hot.',
     'Why did the girl open the window?',
     ['The room was very hot','It was raining','She wanted to sleep'],
     'The room was very hot'],

    ['Mohan visits his uncle every month. His uncle lives in another city.',
     'How often does Mohan visit his uncle?',
     ['Every month','Every week','Every day'],
     'Every month'],

    ['A student named Ravi studies for his exams every evening and takes short breaks.',
     'When does Ravi study?',
     ['Every evening','Every morning','Only on weekends'],
     'Every evening'],

    ['The children planted five trees near their school as part of an environment project.',
     'How many trees did the children plant?',
     ['Five','Three','Ten'],
     'Five'],

    ['A woman named Seema goes to the market early because it is less crowded in the morning.',
     'Why does Seema go early?',
     ['It is less crowded','She has no time','The market closes early'],
     'It is less crowded'],

    ['Vikas enjoys cycling on weekends. He usually cycles for two hours with his friends.',
     'How long does Vikas cycle?',
     ['Two hours','One hour','Three hours'],
     'Two hours'],

    ['The English teacher gave the class a simple story to read and discuss.',
     'What did the teacher give the class?',
     ['A simple story','A difficult test','A poem'],
     'A simple story'],

    ['A family went to a restaurant to celebrate their father’s birthday.',
     'Why did the family go to the restaurant?',
     ['To celebrate their father’s birthday','To study','To buy clothes'],
     'To celebrate their father’s birthday'],

    ['Nikhil drinks fresh fruit juice after his morning exercise.',
     'What does Nikhil drink after exercise?',
     ['Fresh fruit juice','Tea','Coffee'],
     'Fresh fruit juice'],

    ['Priti keeps a diary and writes about her day every night before sleeping.',
     'When does Priti write in her diary?',
     ['Every night','Every morning','Every Sunday'],
     'Every night'],

    ['A boy named Jay loves helping his father in the garden during the weekend.',
     'Who does Jay help?',
     ['His father','His mother','His teacher'],
     'His father'],

    ['The train arrived late because of heavy rain.',
     'Why did the train arrive late?',
     ['Because of heavy rain','Because of traffic','Because of a broken road'],
     'Because of heavy rain'],

    ['Rohini bought a dictionary because she wanted to learn new English words.',
     'Why did Rohini buy a dictionary?',
     ['To learn new English words','To read stories','To write letters'],
     'To learn new English words'],

    ['A family lives in a small house near a river. They enjoy walking beside the river in the evening.',
     'Where does the family live?',
     ['Near a river','Near a mountain','Near a school'],
     'Near a river'],

    ['A student named Varun practices English speaking for twenty minutes every morning.',
     'How long does Varun practice speaking English?',
     ['Twenty minutes','Thirty minutes','One hour'],
     'Twenty minutes'],

    ['The shopkeeper arranged all the books neatly on the shelf before opening the shop.',
     'What did the shopkeeper arrange?',
     ['Books','Shoes','Vegetables'],
     'Books'],

    ['A girl named Nisha saved her pocket money for three months to buy a school bag.',
     'Why did Nisha save money?',
     ['To buy a school bag','To buy a phone','To buy a bicycle'],
     'To buy a school bag'],

    ['Rahul and his friends planted flowers in the school garden on Friday.',
     'When did they plant the flowers?',
     ['Friday','Monday','Sunday'],
     'Friday'],

    ['A man named Ajay reads the newspaper every morning while drinking tea.',
     'What does Ajay drink while reading the newspaper?',
     ['Tea','Coffee','Milk'],
     'Tea'],

    ['The students cleaned their classroom before the teacher arrived.',
     'What did the students clean?',
     ['Their classroom','The playground','The library'],
     'Their classroom'],

    ['Maya wants to travel to London someday because she wants to see famous places there.',
     'Where does Maya want to travel?',
     ['London','Paris','New York'],
     'London'],

    ['A boy named Rohan studies hard because he wants to get good marks in his exams.',
     'Why does Rohan study hard?',
     ['To get good marks','To play games','To watch movies'],
     'To get good marks'],

    ['The family ate dinner together and talked about their day.',
     'What did the family do during dinner?',
     ['They talked about their day','They watched a movie','They played cricket'],
     'They talked about their day'],

    ['A woman named Priya works at a bank. She helps customers with their accounts.',
     'Where does Priya work?',
     ['At a bank','At a school','At a hospital'],
     'At a bank'],

    ['The boy opened his English book and started reading the lesson.',
     'What did the boy start reading?',
     ['The English lesson','A newspaper','A letter'],
     'The English lesson'],

    ['Anita likes visiting new places. She travels with her family during holidays.',
     'When does Anita travel with her family?',
     ['During holidays','Every morning','Every weekend'],
     'During holidays'],

    ['A student named Harish made a daily plan to practice English, read books, and exercise.',
     'What did Harish make?',
     ['A daily plan','A shopping list','A school bag'],
     'A daily plan'],

    ['The little girl was tired after playing in the park for two hours.',
     'Why was the girl tired?',
     ['She played in the park for two hours','She studied all day','She walked to school'],
     'She played in the park for two hours'],

    ['A family bought a new television because their old television stopped working.',
     'Why did the family buy a new television?',
     ['The old one stopped working','They wanted a bigger room','They moved house'],
     'The old one stopped working'],

    ['Kiran wakes up at six, exercises for thirty minutes, and then takes a shower.',
     'What does Kiran do after exercising?',
     ['He takes a shower','He eats dinner','He goes to bed'],
     'He takes a shower'],

    ['A teacher told the students to speak English for five minutes every day.',
     'How long should the students speak English?',
     ['Five minutes','Ten minutes','Thirty minutes'],
     'Five minutes'],

    ['Ravi bought a notebook to write down new words while learning English.',
     'Why did Ravi buy a notebook?',
     ['To write new words','To draw pictures','To write stories'],
     'To write new words'],

    ['The children were excited because their school was going on a picnic the next day.',
     'Why were the children excited?',
     ['Because of the school picnic','Because of an exam','Because school was closed'],
     'Because of the school picnic'],

    ['A woman named Meera makes tea every morning for her family.',
     'What does Meera make every morning?',
     ['Tea','Coffee','Juice'],
     'Tea'],

    ['A boy named Dev practices writing English sentences in his notebook every evening.',
     'What does Dev practice?',
     ['Writing English sentences','Playing cricket','Reading newspapers'],
     'Writing English sentences'],

    ['The family went to the park after dinner and walked for thirty minutes.',
     'When did the family go to the park?',
     ['After dinner','Before breakfast','At noon'],
     'After dinner'],

    ['A student named Pooja wants to improve her vocabulary, so she learns five new words every day.',
     'How many new words does Pooja learn every day?',
     ['Five','Ten','Three'],
     'Five'],

    ['The shopkeeper closed the shop at nine o’clock because there were no customers left.',
     'Why did the shopkeeper close the shop?',
     ['There were no customers left','It was raining','He was going to school'],
     'There were no customers left'],

    ['A family visited their grandparents during the weekend and stayed there for two days.',
     'How long did the family stay?',
     ['Two days','One day','One week'],
     'Two days'],

    ['A boy named Aman helps his younger sister with her homework every evening.',
     'Who does Aman help?',
     ['His younger sister','His brother','His friend'],
     'His younger sister'],

    ['Rina drinks a glass of milk before going to school every morning.',
     'When does Rina drink milk?',
     ['Before going to school','After dinner','Before sleeping'],
     'Before going to school'],

    ['The students were happy because they won the school cricket match.',
     'Why were the students happy?',
     ['They won the cricket match','They finished homework','They got new books'],
     'They won the cricket match'],

    ['A man named Suresh reads English news online every morning to improve his vocabulary.',
     'Why does Suresh read English news?',
     ['To improve his vocabulary','To watch cricket','To learn cooking'],
     'To improve his vocabulary'],

    ['A girl named Riya keeps her school books in a large blue bag.',
     'Where does Riya keep her school books?',
     ['In a large blue bag','On the table','In the cupboard'],
     'In a large blue bag'],

    ['The family prepared a special meal because guests were coming for dinner.',
     'Why did the family prepare a special meal?',
     ['Guests were coming','It was Sunday','They were going shopping'],
     'Guests were coming'],

    ['A student named Amit practices listening to English every day using short audio lessons.',
     'What does Amit practice?',
     ['Listening to English','Writing stories','Playing music'],
     'Listening to English'],

    ['The teacher praised Neha because she completed all her homework on time.',
     'Why did the teacher praise Neha?',
     ['She completed her homework on time','She won a race','She cleaned the classroom'],
     'She completed her homework on time'],

    ['A boy named Rahul wants to speak English confidently, so he talks to his friends in English.',
     'Why does Rahul talk to his friends in English?',
     ['To speak English confidently','To play games','To practice writing'],
     'To speak English confidently'],

    ['The family went for a walk after breakfast because the weather was pleasant.',
     'Why did the family go for a walk?',
     ['The weather was pleasant','They were hungry','It was raining'],
     'The weather was pleasant'],

    ['A woman named Kavita works from home and starts her work at nine in the morning.',
     'When does Kavita start work?',
     ['At nine in the morning','At eight in the evening','At ten at night'],
     'At nine in the morning'],

    ['A young boy named Arjun reads one English story every night before sleeping.',
     'How many English stories does Arjun read every night?',
     ['One','Two','Three'],
     'One'],

    ['The students practiced speaking English together during their lunch break.',
     'When did the students practice English?',
     ['During lunch break','Before school','After dinner'],
     'During lunch break'],

    ['A family bought fresh vegetables from the local market on Saturday morning.',
     'When did the family buy vegetables?',
     ['Saturday morning','Sunday evening','Monday afternoon'],
     'Saturday morning'],

    ['A girl named Meena wants to become a teacher because she enjoys helping children learn.',
     'Why does Meena want to become a teacher?',
     ['She enjoys helping children learn','She likes travelling','She likes cooking'],
     'She enjoys helping children learn'],

    ['A boy named Kunal drinks water regularly because he wants to stay healthy.',
     'Why does Kunal drink water regularly?',
     ['To stay healthy','To become taller','To sleep better'],
     'To stay healthy'],

    ['The school organized a speaking competition, and many students participated.',
     'What competition did the school organize?',
     ['A speaking competition','A drawing competition','A running competition'],
     'A speaking competition'],

    ['A student named Rohan won the speaking competition because he spoke English clearly.',
     'Why did Rohan win the competition?',
     ['He spoke English clearly','He ran quickly','He drew a picture'],
     'He spoke English clearly'],

    ['The teacher gave the students ten minutes to complete the reading activity.',
     'How much time did the students get?',
     ['Ten minutes','Five minutes','Twenty minutes'],
     'Ten minutes'],

    ['A family went to the beach early in the morning to watch the sunrise.',
     'Why did the family go to the beach early?',
     ['To watch the sunrise','To swim at night','To eat lunch'],
     'To watch the sunrise'],

    ['A boy named Jay keeps practicing English even when he makes mistakes.',
     'What does Jay do when he makes mistakes?',
     ['He keeps practicing','He stops learning','He gets angry'],
     'He keeps practicing'],

    ['A girl named Nisha writes five English sentences every day in her notebook.',
     'How many sentences does Nisha write every day?',
     ['Five','Ten','Three'],
     'Five'],

    ['The students learned new vocabulary words and used them in sentences.',
     'What did the students learn?',
     ['New vocabulary words','New games','New songs'],
     'New vocabulary words'],

    ['A man named Ravi listens to English podcasts while traveling to work.',
     'When does Ravi listen to English podcasts?',
     ['While traveling to work','While sleeping','While cooking dinner'],
     'While traveling to work'],

    ['A family has breakfast together every Sunday morning.',
     'When does the family have breakfast together?',
     ['Every Sunday morning','Every Saturday night','Every Monday morning'],
     'Every Sunday morning'],

    ['A teacher named Priya encourages her students to speak English without fear.',
     'What does Priya encourage her students to do?',
     ['Speak English without fear','Play games','Write exams'],
     'Speak English without fear'],

    ['A student named Aman learned ten new English words this week.',
     'How many new words did Aman learn?',
     ['Ten','Five','Twenty'],
     'Ten'],

    ['The children cleaned the playground before their sports activity.',
     'What did the children clean?',
     ['The playground','The classroom','The library'],
     'The playground'],

    ['A girl named Riya practices English pronunciation every morning.',
     'What does Riya practice?',
     ['English pronunciation','Maths','Drawing'],
     'English pronunciation'],

    ['A boy named Arjun helps his mother in the kitchen every evening.',
     'Where does Arjun help his mother?',
     ['In the kitchen','In the garden','In the classroom'],
     'In the kitchen'],

    ['The family watched an English movie together to practice listening.',
     'Why did the family watch an English movie?',
     ['To practice listening','To learn cooking','To play games'],
     'To practice listening'],

    ['A student named Neha reads a short English article every morning.',
     'What does Neha read?',
     ['A short English article','A comic book','A newspaper in Gujarati'],
     'A short English article'],

    ['A man named Vijay practices speaking English with his colleague during lunch.',
     'Who does Vijay practice English with?',
     ['His colleague','His brother','His teacher'],
     'His colleague'],

    ['A girl named Pooja wants to improve her grammar, so she studies grammar rules every evening.',
     'Why does Pooja study grammar rules?',
     ['To improve her grammar','To learn drawing','To play cricket'],
     'To improve her grammar'],

    ['The students completed their reading challenge and received a small reward.',
     'What did the students receive?',
     ['A small reward','A new book','A certificate'],
     'A small reward'],

    ['A boy named Ravi practices English for thirty minutes every day before going to bed.',
     'How long does Ravi practice English?',
     ['Thirty minutes','Twenty minutes','One hour'],
     'Thirty minutes'],

    ['The teacher asked everyone to read the passage carefully before answering the questions.',
     'What did the teacher ask the students to do?',
     ['Read the passage carefully','Close the books','Go outside'],
     'Read the passage carefully'],

    ['A student named Mehul enjoys reading because books help him learn new things.',
     'Why does Mehul enjoy reading?',
     ['Books help him learn new things','Books are expensive','He wants to sleep'],
     'Books help him learn new things'],

    ['A family spends one hour together every evening talking about their day.',
     'How much time does the family spend together?',
     ['One hour','Thirty minutes','Two hours'],
     'One hour'],

    ['A girl named Tara practices English every day and feels more confident now.',
     'How does Tara feel now?',
     ['More confident','More tired','More nervous'],
     'More confident'],

    ['A boy named Karan never gives up when he finds a difficult English word.',
     'What does Karan do with difficult words?',
     ['He keeps trying','He stops reading','He ignores them'],
     'He keeps trying'],

    ['The teacher told the students that regular practice is the key to improving English.',
     'What is the key to improving English?',
     ['Regular practice','Watching television','Sleeping more'],
     'Regular practice'],

    ['A student named Riya wants to speak English fluently, so she practices every day.',
     'Why does Riya practice every day?',
     ['To speak English fluently','To learn dancing','To play sports'],
     'To speak English fluently']
    ]
  },
  speaking: {
    title: 'Speak & Earn', reward: 0.20, dailyLimit: 5,
    questions: ['Introduce yourself in English.','Describe your daily routine.','Talk about your family.','What did you do yesterday?','What is your favorite hobby?','Describe your best friend.','Talk about your school or work.','What do you want to learn?']
  }
};

function todayKey(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function normalize(s){return String(s||'').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();}
function fieldName(type){return `activity_${type}`;}
function publicQuestion(type,q){
  if(type==='arrange') return {prompt:q[0],answer:q[1]};
  if(type==='correction'||type==='translate') return {prompt:q[0],answer:q[1]};
  if(type==='word') return {prompt:q[0],answer:q[1]};
  if(type==='fill') return {prompt:q[0],options:q[1],answer:q[2]};
  if(type==='listening') return {prompt:q,answer:q};
  if(type==='reading') return {passage:q[0],prompt:q[1],options:q[2],answer:q[3]};
  return {prompt:q};
}

function mapGet(map, key) {
  if (!map) return 0;
  if (typeof map.get === 'function') return Number(map.get(key) || 0);
  return Number(map[key] || 0);
}
function mapSet(map, key, value) {
  if (map && typeof map.set === 'function') map.set(key, value);
  else if (map) map[key] = value;
}
function pickRandomQuestions(type, activity, user) {
  const all = activity.questions.map((q,i)=>({id:i,...publicQuestion(type,q)}));
  if (!all.length) return [];
  const last = mapGet(user?.activityLastQuestion, type);
  const shuffled = all.sort(() => Math.random() - 0.5);
  const withoutLast = shuffled.filter(x => x.id !== last);
  return (withoutLast.length ? withoutLast : shuffled).slice(0, Math.min(30, shuffled.length));
}

router.get('/:type', auth, async (req,res)=>{
  const type=req.params.type; const activity=ACTIVITIES[type];
  if(!activity) return res.status(404).json({success:false,message:'Activity not found'});
  const user=await User.findById(req.user.id).select('activityLastQuestion');
  const items=pickRandomQuestions(type,activity,user);
  res.json({success:true,type,title:activity.title,reward:activity.reward,dailyLimit:activity.dailyLimit,questions:items});
});

router.post('/:type/tab-change', auth, async (req,res)=>{
  try {
    const type=req.params.type;
    if(!ACTIVITIES[type]) return res.status(404).json({success:false,message:'Activity not found'});
    const user=await User.findById(req.user.id);
    if(!user) return res.status(404).json({success:false,message:'User not found'});
    user.tabChanges=Number(user.tabChanges||0)+1;
    const current=mapGet(user.activityTabChanges,type);
    mapSet(user.activityTabChanges,type,current+1);

    // Quiz + Activity share ONE anti-cheat warning counter.
    // Any confirmed activity tab/window change counts toward the same
    // 4-violation permanent-block threshold used by Quiz.
    const security = await registerViolation(
      user,
      `Activity (${type}) tab was switched or hidden`
    );

    // When the 4th shared Quiz/Activity violation permanently blocks the
    // account, issue the same subscription-only session used by /auth/block-me
    // so the student can reach the ₹200 subscription gate immediately.
    let subscriptionToken = null;
    if (security.permanentBlocked) {
      const subscriptionSessionId = crypto.randomUUID();
      user.activeSessionId = subscriptionSessionId;
      user.isOnline = false;
      await user.save();
      subscriptionToken = jwt.sign(
        {
          id: user._id,
          sessionVersion: Number(user.sessionVersion || 0),
          activeSessionId: subscriptionSessionId
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    }

    res.json({
      success:true,
      tabChanges:Number(user.tabChanges||0),
      activityTabChanges:current+1,
      antiCheat:true,
      subscriptionToken,
      ...security
    });
  } catch(e){ res.status(500).json({success:false,message:e.message}); }
});

router.post('/:type/submit', auth, async (req,res)=>{
  try{
    const type=req.params.type; const activity=ACTIVITIES[type];
    if(!activity) return res.status(404).json({success:false,message:'Activity not found'});
    const index=Number(req.body.questionId); const answer=String(req.body.answer||'').trim();
    const q=activity.questions[index]; if(!q) return res.status(400).json({success:false,message:'Invalid question'});
    const startedAt = Number(req.body.startedAt || 0);
    const minSeconds = 2;
    const elapsedSeconds = startedAt ? (Date.now() - startedAt) / 1000 : 0;
    if (elapsedSeconds < minSeconds) {
      const security = await registerViolation(await User.findById(req.user.id), `Activity (${type}) answer submitted before reading the question`);
      return res.json({success:false, antiCheat:true, ...security, message:'⚠️ પહેલા પ્રશ્ન ધ્યાનથી વાંચો.'});
    }
    const expected= type==='fill'?q[2] : type==='reading'?q[3] : type==='listening'?q : type==='speaking'?null : q[1];
    let correct=false;
    if(type==='speaking') correct=normalize(answer).split(' ').filter(Boolean).length>=4;
    else correct=normalize(answer)===normalize(expected);
    const user=await User.findById(req.user.id); if(!user) return res.status(404).json({success:false,message:'User not found'});
    const today=todayKey();
    if(!user.activityDate || user.activityDate!==today){ user.activityDate=today; user.activityCounts={}; }
    if(!user.activityCounts) user.activityCounts={};
    const count=Number(user.activityCounts.get ? user.activityCounts.get(type)||0 : user.activityCounts[type]||0);
    if(count>=activity.dailyLimit) return res.status(400).json({success:false,message:`આજની ${activity.title} limit પૂર્ણ થઈ ગઈ છે.`,wallet:Number(user.wallet||0),totalEarn:Number(user.totalEarn||0),correct:false,limitReached:true});
    mapSet(user.activityCounts,type,count+1);
    mapSet(user.activityLastQuestion,type,index);
    const correctCount=mapGet(user.activityCorrect,type);
    const wrongCount=mapGet(user.activityWrong,type);
    const earned=mapGet(user.activityEarn,type);
    const deducted=mapGet(user.activityDeduct,type);
    if(correct){
      user.wallet=Number(user.wallet||0)+activity.reward;
      user.totalEarn=Number(user.totalEarn||0)+activity.reward;
      mapSet(user.activityCorrect,type,correctCount+1);
      mapSet(user.activityEarn,type,earned+activity.reward);
    }else{
      const deduction=Math.min(Number(user.wallet||0),activity.reward);
      user.wallet=Math.max(0, Number(user.wallet||0)-activity.reward);
      mapSet(user.activityWrong,type,wrongCount+1);
      mapSet(user.activityDeduct,type,deducted+deduction);
    }
    await user.save();
    res.json({
      success:true,
      correct,
      reward:correct?activity.reward:-activity.reward,
      wallet:Number(user.wallet||0),
      totalEarn:Number(user.totalEarn||0),
      used:count+1,
      remaining:Math.max(0,activity.dailyLimit-count-1),
      correctCount:correct?correctCount+1:correctCount,
      wrongCount:correct?wrongCount:wrongCount+1,
      activityEarn:correct?earned+activity.reward:earned,
      activityDeduct:correct?deducted:deducted+Math.min(Number(user.wallet||0)+activity.reward,activity.reward),
      correctAnswer:expected
    });
  }catch(e){console.error(e);res.status(500).json({success:false,message:e.message});}
});
module.exports=router;
