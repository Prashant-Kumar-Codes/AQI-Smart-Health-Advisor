from flask import Blueprint, render_template, request, session, flash, redirect, url_for, jsonify
import requests
import mysql.connector
from flask_mail import Message
from app import mail
from datetime import datetime, timedelta
import random
import os