import React, { Component } from 'react';
import firebase from '../Config/Firebase';
import Header from '../Components/Header';
import styles from '../Theme/Theme';
import Dimensions from 'Dimensions'; //Gets devices window dimensions
import uploadImage from '../Config/UploadImage';// blob conversion of photo
import ImagePicker from 'react-native-image-picker'; //allows access of camera
import RNFetchBlob from 'react-native-fetch-blob'; //work-around that enables firebase to accept photos
import ImageResizer from 'react-native-image-resizer'; //auto resizer that helps app performance and look consistency ex. line 40
import gpKey from '../Values/Creds';
import {
    Subtitle,
    Title,
    Caption,
    Row,
    Image,
    Icon,
    Spinner
        } from '@shoutem/ui';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput
} from 'react-native';

const deviceWidth = Dimensions.get('window').width;
const deviceHeight = Dimensions.get('window').height;
const Blob = RNFetchBlob.polyfill.Blob;  //makes blob
const moment = require('moment'); //required to set time on post




class Post extends Component {

    static  childContextTypes = {
        navigator: React.PropTypes.object
    };

    getChildContext () {
        return {
            navigator: this.props.navigator,
        }
    }

    constructor(props) {
        super(props);
        this.state = {
            image: 'https://firebasestorage.googleapis.com/v0/b/findr-3ffd0.appspot.com/o/placeholder.png?alt=media&token=778cf414-8fc7-4288-bd50-1580366ab56a', //placeholder image
            place: {
                name: '',
                lat: '',
                lng: '',
                address: ''
            },
            lat: '',
            long: '',
            nearby: [],
            memory: '',
            createdAt: '',
            uid: '',
            loading: false
        };
    }

    //captures the geolocation of the device and sends that to a fetch on the google places api
    getPlaces = () => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = position.coords.latitude + ',' + position.coords.longitude;
                const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords}&radius=500&key=${gpKey}`;
                fetch(url, {method: "GET"}) //react native's xmlhttp call
                    .then(response => response.json())
                    .then(responseData => {
                        this.setState({ nearby: responseData.results});  //sets the state of nearby, the array from line 40, this is iterated through at line 103
                    })
            }
        )
    };

    // captures image, resizes it, and converts it to a blob
    photo = () => {
        var state = this; // capturing this to uses inside of ImageResizer on line 98. The only solution I could find, but it's hacky.
        window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest; // taken from React Native Fetch Blob docs. I think it is making a request on the photo to the blob
        window.Blob = Blob; // taken from React Native Fetch Blob docs.
        this.setState({loading: true}); //starts spinner
        ImagePicker.showImagePicker({}, (response) => {
            if (!response.didCancel) {
                const source = {
                    uri: response.uri.replace('file://', ''), // unique to ios. it is how the files are labeled
                    isStatic: true};
                //file:// is unique to iOS, will be different for Andriod
                ImageResizer.createResizedImage(source.uri, 500, 500, 'JPEG', 90) //image resizing specs
                    .then((resizedImageURI) => {
                        uploadImage(resizedImageURI)//creates Blob
                            .then(url => state.setState({image: url, loading: false})) //once our image is in firebase we setState to display it
                            .catch((error) => {
                                this.setState({loading: false});
                                console.log('error', error);
                            });
                    });
            }
        });
    };

    //sends completed post to firebase
    async post() {
        let user = firebase.auth().currentUser;
        try {
            await this.setState({
                uid: user.uid,
                createdAt: Date.now()
            });
            firebase.database().ref('food').push({image: this.state.image, place: this.state.place, uid: this.state.uid, memory: this.state.memory, createdAt: this.state.createdAt});

            this.props.navigator.pop();
        }
        catch(e) {
            return e.message
        }
    }

    //link for back navigation
    back = () => {
        this.props.navigator.pop();
    };


    //gets the nearby places as soon as the compnent mounts
    componentDidMount(){
        this.getPlaces();
    }



    render () { // 2nd return This return Updates the place for our post*/
        if (this.state.loading) {
            return(
                <Spinner
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    size="large"
                    color="black"
                />
            )
        }

        return (
            <View>
                <Header
                    title="Post"
                    left={this.back.bind(this)}
                    leftText={'Back'} />
                <View style={styles.center}>
                    <TouchableOpacity onPress={this.photo.bind(this)}>
                        <Image
                            source={{uri: this.state.image}}
                            style={{
                                width: deviceWidth,
                                height: (deviceWidth * .5)}} />
                    </TouchableOpacity>
                    <Title style={styles.textLocation}>{this.state.place.name}</Title>

                    <TextInput
                        style={styles.textPostInput}
                        placeholder="Write a caption. . ."
                        autoCorrect={true}
                        placeholderTextColor="lightgrey"
                        onChangeText={(memory) => this.setState({memory: memory})}
                        value={this.state.memory} />
                    <Subtitle>Add Location</Subtitle>
                    <ScrollView style={{height: deviceHeight*.35}}>
                        {Object.keys(this.state.nearby).map((key) => {
                            var placeObj = {
                                address: this.state.nearby[key].vicinity,
                                lat: this.state.nearby[key].geometry.location.lat,
                                lng: this.state.nearby[key].geometry.location.lng,
                                name: this.state.nearby[key].name
                            };
                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={{padding: 10}}
                                    onPress={(place) => this.setState({place:placeObj})}>
                                    <Row styleName="small">
                                    <Icon name="pin" />
                                        <View styleName="vertical">
                                        <Subtitle style={styles.textPost}>{this.state.nearby[key].name}</Subtitle>
                                        <Caption  style={styles.textPost}>{this.state.nearby[key].vicinity}</Caption>
                                        </View>
                                    </Row>
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>
                    <TouchableOpacity style={styles.btn} onPress={this.post.bind(this)}>
                        <Text style={styles.textPost}>Post</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }
}

export default Post;