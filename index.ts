import { z } from "zod";
import {
  eventSchema,
  exchangeRatesSchema,
  loginEventSchema,
  logoutEventSchema,
  registrationEventSchema,
  transactionEventSchema,
} from "./schemas";
import { groupBy } from "./utils";

type Event = z.infer<typeof eventSchema>;
type RegistrationEvent = z.infer<typeof registrationEventSchema>;
type LoginEvent = z.infer<typeof loginEventSchema>;
type TransactionEvent = z.infer<typeof transactionEventSchema>;
type LogoutEvent = z.infer<typeof logoutEventSchema>;
type ExchangeRate = z.infer<typeof exchangeRatesSchema>;

// Check command line arguments
if (Bun.argv.length !== 4) {
  console.error(
    "Usage: bun index.ts <jsonl-events-file> <jsonl-exchange-rates-file>"
  );
  process.exit(1);
}

const eventsFilePath = Bun.argv[2];
const exchangeRatesFilePath = Bun.argv[3];

// Open events file
const eventsFile = Bun.file(eventsFilePath);

if (!eventsFilePath || !(await eventsFile.exists())) {
  console.error(`File ${eventsFilePath} does not exist`);
  process.exit(1);
}

// Open exchange rates file
const exchangeRatesFile = Bun.file(exchangeRatesFilePath);

if (!exchangeRatesFilePath || !(await exchangeRatesFile.exists())) {
  console.error(`File ${exchangeRatesFilePath} does not exist`);
  process.exit(1);
}

// Read events
const eventsText = await eventsFile.text();

// Read exchange rates
const exchangeRatesText = await exchangeRatesFile.text();

// Split events by line
const eventsLines = eventsText.trim().split("\n");

// Split exchange rates by line
const exchangeRatesLines = exchangeRatesText.trim().split("\n");

console.log(`Total lines: ${eventsLines.length}`);
console.log(`Total exchange rates: ${exchangeRatesLines.length}`);

// Parse events
const events = eventsLines
  .map((e) => {
    const res = eventSchema.safeParse(JSON.parse(e));
    return res.success ? (res.data as Event) : undefined;
  })
  .filter((e): e is Event => e !== undefined);

console.log(`Parsed events: ${events.length}`);

// Parse exchange rates
const exchangeRates = exchangeRatesLines.map((e) => {
  const res = exchangeRatesSchema.safeParse(JSON.parse(e));
  return res.success ? (res.data as ExchangeRate) : undefined;
});

console.log(`Parsed exchange rates: ${exchangeRates.length}`);

// Get unique events based on `event_id`
// Since dataset is relatively small, we can just use `filter`, for big datasets this should be optimized.
let uniqueEvents = events.filter(
  (event, index, array) =>
    array.findIndex((eventOther) => eventOther.event_id === event.event_id) ===
    index
);

console.log(`Unique events based on 'event_id': ${uniqueEvents.length}`);

// Remove events before lunch as a sanity check to make sure the dataset doesn't include possible testing data.
uniqueEvents = uniqueEvents.filter(
  (event) =>
    event.event_timestamp >
    Math.floor(new Date("May 08 2010 00:00:00 GMT").getTime() / 1000)
);

// Get all registered UUIDs
const registeredUsers = uniqueEvents
  .filter((event) => event.event_type === "registration")
  .map((event) => event.event_data.user_id);

// Remove entries where `user_id` is not not found in registrations
uniqueEvents = uniqueEvents.filter((event) =>
  registeredUsers.includes(event.event_data.user_id)
);

console.log(
  `Unique events after removing unregistered users: ${uniqueEvents.length}`
);

// Convert all transactions to USD
uniqueEvents = uniqueEvents.map((event) => {
  if (event.event_type === "transaction") {
    const updatedEvent = event;
    const rate =
      exchangeRates.find(
        (rate) => rate?.currency === event.event_data.transaction_currency
      )?.rate_to_usd ?? 1;

    updatedEvent.event_data.transaction_amount =
      event.event_data.transaction_amount * rate;

    updatedEvent.event_data.transaction_currency = "USD";
    return updatedEvent;
  }
  return event;
});

const writeRegistrations = (events?: Event[]) => {
  const registrations = events as RegistrationEvent[];
  let data = `user_id,timestamp,name,country,device_os,marketing_campaign,event_id\n`;
  for (const registration of registrations) {
    data += `${registration.event_data.user_id},${new Date(
      registration.event_timestamp * 1000
    ).toISOString()},${registration.event_data.name},${
      registration.event_data.country
    },${registration.event_data.device_os},${
      registration.event_data.marketing_campaign
    },${registration.event_id}\n`;
  }
  const file = Bun.file("./output/registrations.csv");
  const writer = file.writer();
  writer.write(data);
  writer.end();
};

const writeLogins = (events?: Event[]) => {
  const logins = events as LoginEvent[];
  let data = `user_id,timestamp,event_id\n`;
  for (const login of logins) {
    data += `${login.event_data.user_id},${new Date(
      login.event_timestamp * 1000
    ).toISOString()},${login.event_id}\n`;
  }
  const file = Bun.file("./output/logins.csv");
  const writer = file.writer();
  writer.write(data);
  writer.end();
};

const writeTransactions = (events?: Event[]) => {
  const transactions = events as TransactionEvent[];
  let data = `user_id,timestamp,amount,event_id\n`;
  for (const transaction of transactions) {
    data += `${transaction.event_data.user_id},${new Date(
      transaction.event_timestamp * 1000
    ).toISOString()},${transaction.event_data.transaction_amount},${
      transaction.event_id
    }\n`;
  }
  const file = Bun.file("./output/transactions.csv");
  const writer = file.writer();
  writer.write(data);
  writer.end();
};

const writeLogouts = (events?: Event[]) => {
  const logouts = events as LogoutEvent[];
  let data = `user_id,timestamp,event_id\n`;
  for (const logout of logouts) {
    data += `${logout.event_data.user_id},${new Date(
      logout.event_timestamp * 1000
    ).toISOString()},${logout.event_id}\n`;
  }
  const file = Bun.file("./output/logouts.csv");
  const writer = file.writer();
  writer.write(data);
  writer.end();
};

// Group events by `event_type`
const eventsByType = groupBy(uniqueEvents, "event_type");
Object.keys(eventsByType).forEach((key) => {
  console.log(`Events of type '${key}': ${eventsByType[key]?.length}`);
  switch (key) {
    case "login":
      writeLogins(eventsByType[key]);
      break;
    case "registration":
      writeRegistrations(eventsByType[key]);
      break;
    case "transaction":
      writeTransactions(eventsByType[key]);
      break;
    case "logout":
      writeLogouts(eventsByType[key]);
      break;
  }
});

const calculateAndWriteSessions = (logins?: Event[], logouts?: Event[]) => {
  if (!logins || !logouts) return;

  type FlattenedEvent = {
    user_id: string;
    event_timestamp: number;
    event_id: number;
    event_type: "registration" | "login" | "transaction" | "logout";
  };

  type Session = {
    user_id: string;
    start_timestamp: number;
    end_timestamp: number;
    duration: number;
  };

  const combinedEvents: FlattenedEvent[] = [...logins, ...logouts]
    .map((e) => ({
      user_id: e.event_data.user_id,
      event_timestamp: e.event_timestamp,
      event_id: e.event_id,
      event_type: e.event_type,
    }))
    .sort((a, b) => {
      if (a.event_timestamp < b.event_timestamp) {
        return -1;
      }
      if (a.event_timestamp > b.event_timestamp) {
        return 1;
      }
      return 0;
    });

  const groupedByUser = groupBy(combinedEvents, "user_id");
  const sessions: Session[] = [];

  Object.keys(groupedByUser).forEach((key) => {
    let currentSession: Session | null = null;
    let userEventsList = groupedByUser[key];
    if (!userEventsList || userEventsList.length === 0) return;
    for (let i = 0; i < userEventsList.length; i++) {
      if (userEventsList[i].event_type === "login") {
        if (currentSession !== null) {
          // If there's an ongoing session, use the first corresponding logout event as the end time
          const correspondingLogout = userEventsList.find(
            (e: FlattenedEvent) =>
              currentSession !== null &&
              e.event_type === "logout" &&
              e.event_timestamp > currentSession.start_timestamp
          ) as FlattenedEvent;

          if (correspondingLogout) {
            currentSession.end_timestamp = correspondingLogout.event_timestamp;
            currentSession.duration =
              currentSession.end_timestamp - currentSession.start_timestamp;
            sessions.push(currentSession);
            currentSession = null;
            userEventsList = [
              ...userEventsList.filter(
                (e: FlattenedEvent) => e !== correspondingLogout
              ),
            ];
          }
        }

        // Start a new session
        currentSession = {
          user_id: userEventsList[i].user_id,
          start_timestamp: userEventsList[i].event_timestamp,
          end_timestamp: 0,
          duration: 0,
        };
      } else if (
        userEventsList[i].event_type === "logout" &&
        currentSession !== null &&
        currentSession.end_timestamp === 0
      ) {
        // End the current session only if it hasn't been closed previously
        currentSession.end_timestamp = userEventsList[i].event_timestamp;
        currentSession.duration =
          currentSession.end_timestamp - currentSession.start_timestamp;
        sessions.push(currentSession);
        currentSession = null;
      }
    }

    if (currentSession !== null && currentSession.end_timestamp === 0) {
      currentSession.end_timestamp =
        userEventsList[userEventsList.length - 1].event_timestamp;
      currentSession.duration =
        currentSession.end_timestamp - currentSession.start_timestamp;
      sessions.push(currentSession);
    }
  });

  console.log(`Total sessions: ${sessions.length}`);

  let data = `user_id,start_date,end_date,duration\n`;
  for (const session of sessions) {
    data += `${session.user_id},${new Date(
      session.start_timestamp * 1000
    ).toISOString()},${new Date(session.end_timestamp * 1000).toISOString()},${
      session.duration
    }\n`;
  }
  const file = Bun.file("./output/sessions.csv");
  const writer = file.writer();
  writer.write(data);
  writer.end();
};

calculateAndWriteSessions(eventsByType["login"], eventsByType["logout"]);
