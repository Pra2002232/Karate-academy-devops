pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        BACKEND_IMAGE = "karate-backend"
        FRONTEND_IMAGE = "karate-frontend"
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Source code is checked out by Jenkins.'
                sh 'git rev-parse --short HEAD'
            }
        }

        stage('Validate Backend') {
            steps {
                dir('backend') {
                    sh '''
                        set -eu
                        npm ci
                        node --check src/app.js
                        npm ls --depth=0
                    '''
                }
            }
        }

        stage('Lint Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        set -eu
                        npm ci
                        npm run lint
                    '''
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        set -eu
                        npm run build
                        test -f dist/index.html
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    set -eu

                    docker build \
                      -t ${BACKEND_IMAGE}:${BUILD_NUMBER} \
                      ./backend

                    docker build \
                      -t ${FRONTEND_IMAGE}:${BUILD_NUMBER} \
                      ./frontend

                    docker image inspect ${BACKEND_IMAGE}:${BUILD_NUMBER}
                    docker image inspect ${FRONTEND_IMAGE}:${BUILD_NUMBER}
                '''
            }
        }
    }

    post {
        success {
            echo 'CI SUCCESS: validation, frontend build, and Docker image builds passed.'
        }
        failure {
            echo 'CI FAILED: inspect the first failed stage in the Jenkins console log.'
        }
    }
}
