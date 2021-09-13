import fetch from 'node-fetch';
import * as fs from 'fs';
import { exit } from 'process';
import { compileFunction } from 'vm';

import express from "express";

// Define "require"
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const csvToJsonData = require("csvtojson");
// import {csvtojson} from 'csvtojson';
// import {json2csv} from 'json2csv';
// const csvToJsonData = csvtojson();
// const jsonToCsvData = json2csv();
const jsonToCsvData = require("json2csv").parse;
// ,"acadiastore","adelphistore"
//const storeNames = ["academyofourladypeacestore","acadiastore","adelphistore"];
// const storeNames = ['asumhstore'];
//https://svc.bkstr.com/store/config?storeName=alcornstatestore
const storeNames = ["arizonastatestore"];
var store_promise = {};
storeNames.forEach(function(strName,index){
    var storeName = strName; 
    var store_id = getStore(strName);
    var J = 0;
    store_id.then(async function(strid){
        // console.log(strid);
        var strId = strid.storeId;
        if(typeof strId == undefined)
        {
            console.log("blocked");
            exit;
        }
        console.log('store id = ',strId);
        // get termId and programId
        var term_id = getTerm(strId);
        await term_id.then(async function(termVal){
            termVal.forEach(async function(term){
                var termId = term.termId;
                var programId = term.programId;
                console.log("term id = ",termId," programId",programId);
                //need for loop to get multiple campuse program and term
                if(typeof termId == undefined)
                {
                    console.log("blocked");
                    exit;
                }
                console.log('program id = ',programId);
                var department = getDaprtment(strId,termId);
                var depName;
                var courseName;
                await department.then((value) => {

                    var dep = value.finalDDCSData.division[0].department;
                    if(typeof dep == undefined)
                    {
                        console.log("blocked");
                        exit;
                    }
                    // save dep array in json filename will be bkstr_'+storeName+'_'+storeId+'_'+termId+'_department.json',data
                    var depFile = JSON.stringify(dep);
                        fs.writeFile('./bkstr_deps/bkstr_'+storeName+'_'+strId+'_'+termId+'_department.json',depFile, function (err) {
                            if (err) throw err;
                            console.log('Department Saved');
                        });
                    var fullData = [];
                    var i = 0;
                    var j = 0;
                    console.log('department = ',dep);
                    dep.forEach((val,index) => {
                        depName = val.depName;
                        val.course.forEach((val2,index2)=>{
                            courseName = val2.courseName;
                            val2.section.forEach((val3,index3)=>{
                                let section = val3.sectionName;
                                let course = {"secondaryvalues":depName+"/"+courseName+"/"+section,"divisionDisplayName":"","departmentDisplayName":depName,"courseDisplayName":courseName,"sectionDisplayName":section};
                                if(i<28){
                                    fullData.push(course);
                                    i++;
                                }else{
                                    // Create a function 
                                    J++;
                                    // return;
                                    try{
                                        // get and store course data
                                        console.log('IN Store Data Function');
                                        storeData(storeName,strId,termId,programId,depName,courseName,J,fullData, store_promise);
                                        i=0;
                                        fullData = [];
                                        return false;
                                    } catch(err){
                                        console.log(err);
                                    }
                                }
                            })
                        })
                    });
                    if(i>0){
                        J++;
                        // get and store course data
                        storeData(storeName,strId,termId,programId,depName,courseName,J,fullData, store_promise);
                    }
                // After for loop  check if i > 0 then you have to call getCourses for remianing course data and save it this is why i asked you to creat function under try  
                });
            })
        })
    })
    wait();
});
//"termId":"100070381","termName":"Fall 2021","programId":"1902"





// const course =  getCourses(storeId,termId,programId)
// const courselist = JSON.stringify(course)
// console.log(courselist)

//get storeId from link of arrays.
async function getStore(storeName) {
  //  wait();
    const str =  await fetch(`https://svc.bkstr.com/store/config?storeName=${storeName}`, {
        method: 'GET',
        mode: 'cors',
        headers: getHeaderString(),
    })
    // console.log(str)
    const ret = await str.json();  
    return ret;  
}

//get termId and programId from storeId
async function getTerm(storeId) {
    wait();
    //https://svc.bkstr.com/courseMaterial/info?storeId=166904
    const str =  await fetch(`https://svc.bkstr.com/courseMaterial/info?storeId=${storeId}`, {
        method: 'GET',
        mode: 'cors',
        headers: getHeaderString(),
    });

    const ret = await str.json();  
    var termData = [];
    // console.log('term id and program id');
    let camp = ret.finalData?.campus;
    camp.forEach(function(val,index){
        val.program[0].term.forEach(function(val2,index2){
            let termId = val2.termId;
            let programId = val.program[0].programId;
            termData.push({termId,programId});
        })
    })
    console.log(termData);
    //need forloop to crete array
    // termData.push({termId: val.program[0]?.term[0]?.termId,programId: val.program[0]?.programId});
    return termData;  
}

async function getDaprtment(storeId,termId) {
    wait();
    //https://svc.bkstr.com/courseMaterial/courses?storeId=166904&termId=100070759
const d =  await fetch(`https://svc.bkstr.com/courseMaterial/courses?storeId=${storeId}&termId=${termId}`, {
    method: 'GET',
    mode: 'cors',
    headers: getHeaderString(),
    })
    const ret = await d.json();  
    console.log('dpartment');
    console.log(ret.finalDDCSData?.division[0]?.department);
    return ret;  
}

async function getCourses(storeId,termId,programId,fullData) {
    wait();
const rest = await fetch(`https://svc.bkstr.com/courseMaterial/results?storeId=${storeId}&langId=-1&requestType=DDCSBrowse`, {
    method: 'POST',
    headers: getHeaderString(),
        body: '{"storeId":'+storeId+',"termId":'+termId+',"programId":'+programId+',"courses":'+fullData+'}'
    });
    const ret = await rest.json();   
    return ret;  
}

function wait(ms){
    ms = ms || false;
    if (!ms) {
        ms = generateTimeStamp(2000, 4000);
        ms = generateTimeStamp(2000, 4000);
    }
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
        end = new Date().getTime();
    }
}

function generateTimeStamp(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function storeData(storeName,strId,termId,programId,depName,courseName,J,fullData, store_promise){
    console.log("Sending 20-data of ",storeName,", ",depName,", ",courseName," and section send to get course and book details.");
    //console.log('fullData',fullData);
    const newData = JSON.stringify(fullData);
    store_promise[J] = getCourses(strId,termId,programId,newData);
    await store_promise[J].then(function(value) {
        console.log('course details and books of given data.', value);
        const data = JSON.stringify(value);
        console.log('course details and books of given data.', value);
        // const data = JSON.stringify(value);
        fs.writeFile('./bkstr/bkstr_'+storeName+'_'+strId+'_'+termId+'_'+depName+'_'+courseName+'_'+J+'.json',data, function (err) {
            if (err) { 
                throw err;
            }
            console.log('storeData Saved');
            // wait();
        });

        let cmdata = value;
        csvToJsonData()
        .fromFile("./csv/bkstr.csv")
        .then((source) => {
            cmdata.forEach(function (val, index) {
                const row = getBlankRow();
                // console.log(val["storeId"]);
                row["storeid"] = val.storeId;
                row["storenumber"] = val.storeNumber;
                row["storedisplayname"] = val.storeDisplayName;
                // console.log(row);
                if(!val.courseSectionDTO){
                  source.push(row);
                }else{
                  val.courseSectionDTO.forEach(function (val2, index2) {
                    const row1 = getBlankRow();
                    row1["storeid"] = val.storeId;
                    row1["storenumber"] = val.storeNumber;
                    row1["storedisplayname"] = val.storeDisplayName;
                    row1["termid"] = val2.termId;
                    row1["termname"] = val2.termName;
                    row1["termnumber"] = val2.termNumber;
                    row1["programid"] = val2.programId;
                    row1["programname"] = val2.programName;
                    row1["campusid"] = val2.campusId;
                    row1["campusname"] = val2.campusName;
                    row1["department"] = val2.department;
                    row1["departmentname"] = val2.departmentName;
                    row1["division"] = val2.division;
                    row1["divisionname"] = val2.divisionName;
                    row1["courseid"] = val2.courseId;
                    row1["coursename"] = val2.courseName;
                    row1["section"] = val2.section;
                    row1["sectionname"] = val2.sectionName;
                    row1["instructor"] = val2.instructor;
                    row1["schoolname"] = val2.institutionName;
                    // console.log(row);
                    if(!val2.courseMaterialResultsList){
                      source.push(row1);
                    }else{
                      val2.courseMaterialResultsList.forEach(function(val3,index3){
                        const row2 = getBlankRow();
                        row2["storeid"] = val.storeId;
                        row2["storenumber"] = val.storeNumber;
                        row2["storedisplayname"] = val.storeDisplayName;
                        row2["termid"] = val2.termId;
                        row2["termname"] = val2.termName;
                        row2["termnumber"] = val2.termNumber;
                        row2["programid"] = val2.programId;
                        row2["programname"] = val2.programName;
                        row2["campusid"] = val2.campusId;
                        row2["campusname"] = val2.campusName;
                        row2["department"] = val2.department;
                        row2["departmentname"] = val2.departmentName;
                        row2["division"] = val2.division;
                        row2["divisionname"] = val2.divisionName;
                        row2["courseid"] = val2.courseId;
                        row2["coursename"] = val2.courseName;
                        row2["section"] = val2.section;
                        row2["sectionname"] = val2.sectionName;
                        row2["instructor"] = val2.instructor;
                        row2["schoolname"] = val2.institutionName;
                        row2["cmid"] = val3.cmId;
                        row2["mtcid"] = val3.mtcId;
                        row2["bookimage"] = val3.bookImage;
                        row2["title"] = val3.title;
                        row2["edition"] = val3.edition;
                        row2["author"] = val3.author;
                        row2["isbn"] = val3.isbn;
                        row2["materialtype"] = val3.materialType;
                        row2["requirementtype"] = val3.requirementType;
                        row2["publisher"] = val3.publisher;
                        row2["publishercode"] = val3.publisherCode;
                        row2["productcatentryid"] = val3.productCatentryId;
                        row2["copyrightyear"] = val3.copyRightYear||"";
                        row2["pricerangedisplay"] = val3.priceRangeDisplay;
                        source.push(row2);
                      })
                    }
                  });
                }
            });
            const csv = jsonToCsvData(source,{fields:["storeid","storenumber","storedisplayname","termid","termname","termnumber","programid","programname","campusid","campusname","department","departmentname","division","divisionname","courseid","coursename","section","sectionname","instructor","schoolname","cmid","mtcid","bookimage","title","edition","author","isbn","materialtype","requirementtype","publisher","publishercode","productcatentryid","copyrightyear","pricerangedisplay"]});
            fs.writeFileSync("./csv/bkstr.csv",csv);
        });

    })
}

function getHeaderString()
{
    return  {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
       // 'User-Agent': 'Mozilla/5.0 (X11; CrOS x86_64 8272.45.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.2704.64 Safari/537.36'
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
    }
    return {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Windws NT 10) AppleWebKit/536.36 (KHTML, like Gecko) Chrome/91.0.4515.159 Safari/537.36',
        'authority': 'svc.bkstr.com',
        'dnt': '1',
        'upgrade-insecure-requests': '1',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'sec-fetch-site': 'none',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-user': '?1',
        'sec-fetch-dest': 'document',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        'cache-control': 'no-cache',
        'sec-ch-ua': '"Chromium";v="92", " Not A;Brand";v="99", "Google Chrome";v="92"'
    }
}

function getBlankRow() {
    return {
        storeid: "",
        storenumber: "",
        storedisplayname: "",
        termid:"",
        termname:"",
        termnumber:"",
        programid:"",
        programname:"",
        campusid:"",
        campusname:"",
        department:"",
        departmentname:"",
        division:"",
        divisionname:"",
        courseid:"",
        coursename:"",
        section:"",
        sectionname:"",
        instructor:"",
        schoolname:"",
        cmid:"",
        mtcid:"",
        bookimage:"",
        title:"",
        edition:"",
        author:"",
        isbn:"",
        materialtype:"",
        requirementtype:"",
        publisher:"",
        publishercode:"",
        productcatentryid:"",
        copyrightyear:"",
        pricerangedisplay:""
    };
}

