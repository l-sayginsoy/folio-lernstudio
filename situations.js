'use strict';
const SITUATIONS={
  london:[
    ['Dein Treffpunkt liegt auf der anderen Straßenseite. Auf dem Schild steht „Use the subway“. Wohin gehst du?','Durch die Unterführung','Zur Rolltreppe','Zur nächsten Kreuzung'],
    ['„Meet me on the high street.“ Wo wartet dein Freund?','Auf der Hauptstraße','An der Landstraße','Im Wohnblock'],
    ['„Watch out for pickpockets.“ Worauf weist das Schild hin?','Auf Taschendiebe','Auf eine Straßenkreuzung','Auf eine Rolltreppe']
  ],
  country:[
    ['Ihr kommt auf eine Weide. „Close the gate, please.“ Was machst du?','Ich schließe das Tor.','Ich öffne das Fenster.','Ich bleibe ruhig.'],
    ['„The water is deep here.“ Was erfährst du über den See?','Das Wasser ist hier tief.','Das Wasser ist hier ruhig.','Das Wasser ist hier kalt.'],
    ['„Let’s walk across the fields.“ Welchen Weg schlägt jemand vor?','Quer über die Felder','An der Kirche vorbei','Durch den Wald']
  ],
  phone:[
    ['Rob ist nicht zu Hause. Du möchtest am Telefon etwas ausrichten. Was fragst du?','Can I take a message?','Is that the Taylors?','Who’s speaking?'],
    ['Jemand ruft an. Du möchtest wissen, wer am Apparat ist.','Who’s speaking?','This is Rob Blake.','Take it easy!'],
    ['Das Handy klingelt. Du erkennst es am Ton. Wie heißt dieser Ton?','ringtone','message','business']
  ],
  stories:[
    ['„We’ve bought a van.“ Was ist passiert?','Wir haben einen Transporter gekauft.','Wir haben einen Transporter gefunden.','Wir haben einen Transporter gesehen.'],
    ['„You don’t have to come.“ Was bedeutet das für dich?','Ich darf selbst entscheiden.','Ich darf auf keinen Fall kommen.','Ich muss jetzt kommen.'],
    ['„He hasn’t started yet.“ Welche Aussage passt?','Er hat noch nicht angefangen.','Er ist gerade fertig geworden.','Er fängt immer früh an.']
  ]
};
