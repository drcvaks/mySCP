import { Text, View } from "react-native";
import { chaburos, currentUser } from "../../src/data/mockData";
import { Button, Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";

export default function DirectoryScreen() {
  return (
    <Screen title="Directory" eyebrow="Find SCP locations">
      <Card>
        <SectionTitle>Search</SectionTitle>
        <Text style={styles.muted}>Search by chaburah name, city, or rabbi. Default location: {currentUser.city}, {currentUser.country}.</Text>
      </Card>

      {chaburos.map((chaburah) => {
        const joined = chaburah.id === currentUser.chaburahId;

        return (
          <Card key={chaburah.id}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{chaburah.name}</Text>
                <Text style={styles.muted}>{chaburah.rabbiName}</Text>
              </View>
              <Pill label={`${chaburah.memberCount} members`} />
            </Row>
            <Text style={styles.body}>{chaburah.schedule}</Text>
            <Text style={styles.muted}>{chaburah.address}</Text>
            <Button label={joined ? "Joined" : "Join Chaburah"} variant={joined ? "secondary" : "primary"} />
          </Card>
        );
      })}
    </Screen>
  );
}
