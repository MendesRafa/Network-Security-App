import React, {Component} from "react";
import axios from 'axios';


class App extends Component {
  state = {
    users: [],
    user: null,
    password: null,
    isLoggedIn: false,
    group: []
  };

  getUsersFromDB = () => {
    fetch('http://localhost:3001/api/getUsers')
      .then((data) => data.json())
      .then((res) => this.setState({users: res.data}));
  };

  register = (username, password) => {
    axios.post('http://localhost:3001/api/register', {
      user: username,
      password: password,
    })
    .then((res) => {
      if(res.data.success){
        this.setState({isLoggedIn: true });
        this.getUsersFromDB();
      }
      else {
        window.alert(res.data.error);
        this.setState({user: null, password: null});
        document.getElementById('password').value='';
        document.getElementById('username').value='';
      }
    });
  };

  login = (username, password) => {
    axios.get('http://localhost:3001/api/login', {
      params: {
        user: username,
        password: password
      }
    })
    .then((res) => {
      if(res.data.success){
        this.setState({isLoggedIn: true, group: res.data.data.group });
        this.getUsersFromDB();
      }
      else {
        window.alert(res.data.error);
        this.setState({user: null, password: null});
        document.getElementById('password').value='';
        document.getElementById('usernam').value='';
      }
    });
  };

  addToGroup = () => {
    var e = document.getElementById('userSelect');
    var user = e.options[e.selectedIndex].value;

    this.state.group.push(user);
    this.setState({group: this.state.group});
    axios.post('http://localhost:3001/api/updateGroup', {
      user: this.state.user,
      update: this.state.group
    });
  };

  removeFromGroup = () => {
    var e = document.getElementById('userDelete');
    var user = e.options[e.selectedIndex].value;

    var newGroup = this.state.group.filter(e => e !== user);
    this.setState({group: newGroup});
    axios.post('http://localhost:3001/api/updateGroup', {
      user: this.state.user,
      update: newGroup
    });
  };

  encrypt = () => {
    var message = document.getElementById('encrypt').value;

    var e = document.getElementById('userEncrypt');
    var user = e.options[e.selectedIndex].value;


    axios.get('http://localhost:3001/api/encrypt', {
      params: {
        user: user,
        message: message
      }
    })
    .then((res) => {
      if(res.data.success){
        document.getElementById('encrypt').value=res.data.message;
      }
      else {
        window.alert(res.data.error);
        document.getElementById('encrypt').value='';
      }
    });
  };

  decrypt = () => {
    var message = document.getElementById('decrypt').value;
    axios.get('http://localhost:3001/api/decrypt', {
      params: {
        user: this.state.user,
        message: message
      }
    })
    .then((res) => {
      if(res.data.success){
        var bufferOriginal = Buffer.from(res.data.message.data);
        document.getElementById('decrypt').value=bufferOriginal.toString();
      }
      else {
        window.alert(res.data.error);
        document.getElementById('decrypt').value='';
      }
    });
  };
  
  render() {
    if (this.state.isLoggedIn) {
      return (
        <div>
          <div>
          Welcome {this.state.user}
          </div>
          <button onClick={() => this.setState({user: null, password: null, isLoggedIn: false, group: []})}>
            Logout
          </button>
          <br/>
          <br/>
          <label>Add a user to your trusted group: </label>
          <select id="userSelect">
          {this.state.users.map((data) => {
            if (data.user != this.state.user && !this.state.group.includes(data.user)){
              return (
                <option value={data.user} key={data.user}>{data.user}</option>
              );
            }
          })}
          </select>
          <button onClick={() => this.addToGroup()}>
              Add
          </button>
          <br/>
          <br/>
          <label>Remove a user from your trusted group: </label>
          <select id="userDelete">
          {this.state.group.map((data) => {
            return(
              <option value={data} key={data}>{data}</option>
            )
          })}
          </select>
          <button onClick={() => this.removeFromGroup()}>
              Remove
          </button>
          <br/>
          <br/>
          <div>
            <textarea
              id="encrypt"
              type="text"
              placeholder="Encrypt..."
              style={{ width: '300px' , height: '100px'}}
            />
          </div>
          <select id="userEncrypt">
          {this.state.group.map((data) => {
            return(
              <option value={data} key={data}>{data}</option>
            )
          })}
          </select>
          <button onClick={() => this.encrypt()}>
            Encrypt
          </button>
          <br/>
          <br/>
          <div>
            <textarea
              id="decrypt"
              type="text"
              placeholder="Decrypt..."
              style={{ width: '300px' , height: '100px'}}
            />
          </div>
          <button onClick={() => this.decrypt()}>
            Decrypt
          </button>
          <br/>
          <br/>
          <div>
            Your current group: 
            <ul id="group">
              {this.state.group.length <= 0 ? 'EMPTY' : this.state.group.map((data) => (
                <li style = {{ padding: '10px'}} key={data}>
                  {data}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
    else {
      return (
        <div>
          <br/>
          <div style = {{paddding: '10px'}}>
            <input
              id="usernam"
              type="text"
              onChange={(e) => this.setState({ user: e.target.value })}
              placeholder="Username"
              style={{ width: '200px' }}
            />
            <br/>
            <input
              id="password"
              type="password"
              onChange={(e) => this.setState({ password: e.target.value })}
              placeholder="Password"
              style={{ width: '200px' }}
            />
            <br/>
            <button onClick={() => this.register(this.state.user, this.state.password)}>
              Register
            </button>
            <button onClick={() => this.login(this.state.user, this.state.password)}>
              Login
            </button>
          </div>
        </div>
      );
    }
  }
}

export default App;