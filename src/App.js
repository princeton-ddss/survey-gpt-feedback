import React from 'react';
import { Routes, Route, Outlet, useParams } from 'react-router-dom';
import './App.css';
import { LinearProgress, List } from '@mui/material';
import { ListItem } from '@mui/material';
import { ListItemText } from '@mui/material';
import { ListItemAvatar } from '@mui/material';
import { Avatar } from '@mui/material';
import { Container } from '@mui/system';
import { Grid } from '@mui/material';
import { FormControl } from '@mui/material';
import { TextField } from '@mui/material';
import { Box } from '@mui/material';
import { Alert } from '@mui/material';
import { IconButton } from '@mui/material';
import { Collapse } from '@mui/material';
import { Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { retry } from '@lifeomic/attempt';
import assistant from './assistant.png';


const instructions = {
  role: "system",
  content:`You are a helpful robot.`, // replace with feedback instructions
}

const initMessage = {
  role: "assistant",
  content: "Hi! Thanks for taking the time to provide feedback on our website. Are you ready to begin?", // replace with ChatGPT response to instructions with `temp=0`
}

export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Default />} />
          <Route path="survey/:surveyId" element={<Feedback />} />
        </Route>
      </Routes>
    </div>
  );
}

function Layout() {
  return (
    <div className="App">
      <header className="App-header">
        <Container disableGutters={true} maxWidth={false}>
          <p>Welcome to SurveyGPT!</p>
          <Outlet />
        </Container>
      </header>
      <footer className="App-footer">
        Icons created by <a href="https://www.flaticon.com/free-icons/avatar" title="avatar icons">Freepik - Flaticon</a>
      </footer>
    </div>
  )
}

function Default() {
  // TODO: Give user an option to enter they surveyId manually?
  return (
    <div>
      <Container maxWidth="sm">
        <Typography>
          Uh oh! It looks like you've arrived here by mistake. If you would like provide feedback to the SurveyGPT website, please follow the link at the end of your suvey. Thanks!
        </Typography>
      </Container>
    </div>
  )
}

function Feedback() {
  const { surveyId } = useParams();

  const [ messages, setMessages ] = React.useState([instructions, initMessage]);
  const [ userMessage, setUserMessage ] = React.useState({role: "user", content: ""});
  const [ isLoading, setIsLoading ] = React.useState(false);
  const [ error, setError ] = React.useState(null);
  const [ surveyFinished, setSurveyFinished ] = React.useState(false);

  const submitUserMessage = async () => {
    setIsLoading(true);
    setError(null);
    const prevMessages = [...messages];
    setMessages([...prevMessages, userMessage]);
    let response;
    try {
      response = await retry(async () => {
        console.log("attempting submitUserMessage...");
        const res = await fetch("../.netlify/functions/submitUserMessage", {
          method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify([...prevMessages, userMessage]),
        });
        if (!res.ok) {
          const message = await res.text();
          const error = new Error(message.split('\n')[0]);
          error.status = res.status;
          throw error
        }
        return res;
      }, {
        delay: 1000,
        factor: 2,
        maxAttempts: 3
      });
    } catch (error) {
      console.log(error);
      setIsLoading(false);
      setMessages([...prevMessages]);
      setError(error);
    }
    if (response) {
      setIsLoading(false);
      const newMessages = await response.json();
      const index = newMessages[newMessages.length - 1].content.search("<SURVEY_ENDED>");
      if (index > -1) {
        setSurveyFinished(true);
        const assistantMessage = {
          role: "assistant",
          content: newMessages[newMessages.length - 1].content.slice(0, index)
        };
        setMessages([...prevMessages, userMessage, assistantMessage]);
        saveMessages([...prevMessages, userMessage, assistantMessage]);
      } else {
        setMessages([...newMessages]);
      }
      setUserMessage({
        role: "user",
        content: "",
      });
    }
  }

  const saveMessages = async (messages) => {
    try {
      await fetch("../.netlify/functions/saveMessages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          surveyId: surveyId,
          messages: messages.slice(1), // skip initial system message
        })
      })
      setSurveyFinished(true);
    } catch (error) {
      console.log(`error: failed to save messages (${error})`);
      setError({databaseError: "yes"});
    }
  }

  return (
    <div>
      <Messages
        messages={messages} />
      {!surveyFinished ? (
        <Input
          setMessages={setMessages}
          setUserMessage={setUserMessage}
          userMessage={userMessage}
          submitUserMessage={submitUserMessage}
          saveMessages={saveMessages}
          isLoading={isLoading}
          error={error}
          setError={setError} />
        ) : (
        <Typography variant="body2" marginTop={5}>
          <em>Thank you for your feedback!</em>
        </Typography>
        )}
    </div>
  );
}

function Messages(props) {

  const assistantBackground = 'rgb(247, 247, 247)';
  const userBackground = 'rgb(255, 255, 255)';

  return (
    <div className="Messages">
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {props.messages.slice(1).map((message) =>
          <ListItem
            key={message.content}
            alignItems='flex-start'
            sx={{
              bgcolor: message.role === "assistant" ? assistantBackground : userBackground
            }}>
            <ListItemAvatar>
              <Avatar alt={message.role.toUpperCase()} src={message.role === "assistant" ? assistant : null}/>
            </ListItemAvatar>
            <ListItemText
              primary={message.content}>
            </ListItemText>
          </ListItem>
        )}
      </List>
    </div>
  )
}

function Input(props) {
  return (
    <div className="Input">

      <Grid
        container
        columns={24}
        spacing={0}>
        
        <Grid item xs={1}></Grid>
        <Grid
          item
          xs={22}>
            <FormControl fullWidth>
              <ErrorMessage 
                error={props.error}
                setError={props.setError} />
            </FormControl>
        </Grid>
        <Grid item xs={1}></Grid>

      </Grid>

      <Grid
        container
        columns={24}
        sx={{
          'paddingTop': 2,
        }}
        spacing={2}>
        
        <Grid item xs={1}></Grid>
        <Grid
          item
          xs={22}>
            <FormControl fullWidth>
              <TextField
                variant="outlined"
                size="small"
                value={props.userMessage.content}
                label="Submit a message..."
                onChange={(event) => {
                  props.setUserMessage({
                    role: "user",
                    content: event.target.value,
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    props.submitUserMessage();
                  }
                }}>
              </TextField>
            </FormControl>
        </Grid>
        <Grid item xs={1}></Grid>

        {/* <Grid
          item
          xs={1}>
            <FormControl fullWidth>
              <Button
                onClick={() => {
                  props.setMessages([]);
                  props.setUserMessage({
                    role: "user",
                    content: "",
                  });
                }}
                variant='contained'>
                Reset
              </Button>
            </FormControl>
          </Grid> */}

      </Grid>
      
      {props.isLoading && (
        <Grid
          container
          columns={24}
          sx={{
            'paddingTop': 2,
          }}
          spacing={2}>
          <Grid item xs={1}></Grid>
          <Grid
            item
            xs={22}>
              <FormControl fullWidth>
                <LinearProgress></LinearProgress>
              </FormControl>
          </Grid>
          <Grid item xs={1}></Grid>
        </Grid>
      )}
      
    </div>
  )
}

function ErrorMessage(props) {

  return (
    <Box sx={{ width: '100%' }}>
      <Collapse in={props.error !== null}>
        <Alert
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => {
                props.setError(null);
              }}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
          severity="error"
          sx={{ mb: 2 }}
        >
          {props.error ? props.error.message : ""}
        </Alert>
      </Collapse>
    </Box>
  );
}
