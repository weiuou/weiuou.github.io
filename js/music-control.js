/* global APlayer */

document.addEventListener('DOMContentLoaded', function() {
  'use strict';
  // 等待APlayer加载完成
  function waitForAPlayer(callback) {
    if (typeof APlayer !== 'undefined') {
      // 检查是否有APlayer实例
      const aplayerElements = document.querySelectorAll('.aplayer');
      if (aplayerElements.length > 0) {
        // 尝试从多个可能的位置获取APlayer实例
        let foundAp = window.ap || window.aplayer;
        
        // 如果没有找到全局实例，尝试从DOM元素获取
        if (!foundAp) {
          for (let element of aplayerElements) {
            if (element.aplayer) {
              foundAp = element.aplayer;
              break;
            }
          }
        }
        
        // 尝试从MetingJS创建的实例获取
        if (!foundAp) {
          // 检查MetingJS可能创建的全局变量
          if (window.metingjs && window.metingjs.aplayer) {
            foundAp = window.metingjs.aplayer;
          } else {
            // 遍历所有可能的APlayer实例
            for (let i = 0; i < 10; i++) {
              if (window['ap' + i]) {
                foundAp = window['ap' + i];
                break;
              }
            }
          }
        }
        
        // 最后尝试：检查DOM元素的data属性或直接访问
        if (!foundAp) {
          for (let element of aplayerElements) {
            // 检查元素上可能存储的实例
            if (element._aplayer || element.aplayerInstance) {
              foundAp = element._aplayer || element.aplayerInstance;
              break;
            }
            // 检查父元素
            const parent = element.parentElement;
            if (parent && (parent._aplayer || parent.aplayerInstance)) {
              foundAp = parent._aplayer || parent.aplayerInstance;
              break;
            }
          }
        }
        
        if (foundAp) {
          window.ap = foundAp; // 确保全局可访问
          console.log('APlayer instance found:', foundAp);
          callback();
          return;
        }
      }
    }
    setTimeout(() => waitForAPlayer(callback), 200);
  }

  // 创建音乐控制按钮和面板
  function createMusicControl() {
    // 注释掉音乐控制按钮的创建 - 用户要求删除
    // const musicControl = document.createElement('div');
    // musicControl.className = 'music-control';
    // musicControl.innerHTML = '<i class="fa fa-music music-icon"></i>';
    
    // 创建控制面板
    const musicPanel = document.createElement('div');
    musicPanel.className = 'music-panel';
    musicPanel.innerHTML = `
      <div class="music-info">
        <div class="song-cover">
          <img id="current-song-cover" src="./images/default-cover.svg" alt="歌曲封面">
        </div>
        <div class="song-details">
          <div class="music-title">暂无播放</div>
          <div class="music-artist">点击播放音乐</div>
        </div>
      </div>
      <div class="music-progress">
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <div class="progress-time">
          <span class="current-time">00:00</span>
          <span class="total-time">00:00</span>
        </div>
      </div>
      <div class="music-controls">
        <button class="control-btn prev-btn">
          <i class="fa fa-step-backward"></i>
        </button>
        <button class="control-btn play-pause">
          <i class="fa fa-play"></i>
        </button>
        <button class="control-btn next-btn">
          <i class="fa fa-step-forward"></i>
        </button>
      </div>
      <div class="music-volume">
        <i class="fa fa-volume-up volume-icon"></i>
        <div class="volume-slider">
          <div class="volume-fill"></div>
        </div>
        <span class="volume-value">70</span>
      </div>
    `;
    
    // 注释掉添加音乐控制按钮到页面 - 用户要求删除
    // document.body.appendChild(musicControl);
    document.body.appendChild(musicPanel);
    
    // 返回null代替musicControl，因为已被删除
    return { musicControl: null, musicPanel };
  }

  // 格式化时间
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 音量更新防抖和标志位
  let volumeUpdateTimeout = null;
  let isVolumeUpdating = false;
  
  // 初始化音乐控制功能
  function initMusicControl() {
    const { musicControl, musicPanel } = createMusicControl();
    let isExpanded = false;
    
    // 获取DOM元素 - musicControl已被删除，跳过相关元素获取
    const musicIcon = musicControl ? musicControl.querySelector('.music-icon') : null;
    const currentSongCover = musicPanel.querySelector('#current-song-cover');
    const musicTitle = musicPanel.querySelector('.music-title');
    const musicArtist = musicPanel.querySelector('.music-artist');
    const progressFill = musicPanel.querySelector('.progress-fill');
    const progressBar = musicPanel.querySelector('.progress-bar');
    const currentTimeEl = musicPanel.querySelector('.current-time');
    const totalTimeEl = musicPanel.querySelector('.total-time');
    const playPauseBtn = musicPanel.querySelector('.play-pause');
    const prevBtn = musicPanel.querySelector('.prev-btn');
    const nextBtn = musicPanel.querySelector('.next-btn');
    const volumeSlider = musicPanel.querySelector('.volume-slider');
    const volumeFill = musicPanel.querySelector('.volume-fill');
    const volumeValue = musicPanel.querySelector('.volume-value');
    const volumeIcon = musicPanel.querySelector('.volume-icon');
    
    // 检测当前音乐播放器类型
    function getCurrentPlayerType() {
      if (window.localMusicPlayer || window.musicPlayer) {
        return 'local';
      } else if (window.ap) {
        return 'aplayer';
      }
      return null;
    }
    
    // 切换面板显示
    function togglePanel() {
      isExpanded = !isExpanded;
      musicPanel.classList.toggle('show', isExpanded);
    }
    
    // 更新播放状态
    function updatePlayState() {
      try {
        const playerType = getCurrentPlayerType();
        let isPlaying = false;
        
        if (playerType === 'local') {
          const localPlayer = window.localMusicPlayer || window.musicPlayer;
          if (localPlayer) {
            isPlaying = localPlayer.isPlaying;
            console.log('本地播放器状态更新:', isPlaying ? '播放中' : '暂停');
          }
        } else if (playerType === 'aplayer') {
          if (window.ap && window.ap.audio) {
            isPlaying = !window.ap.audio.paused && !window.ap.audio.ended;
            console.log('APlayer状态更新:', isPlaying ? '播放中' : '暂停');
          }
        }
        
        // musicControl已被删除，跳过样式更新
        if (musicControl) {
          musicControl.classList.toggle('playing', isPlaying);
        }
        if (playPauseBtn) {
          playPauseBtn.innerHTML = isPlaying ? '<i class="fa fa-pause"></i>' : '<i class="fa fa-play"></i>';
        }
        if (musicIcon) {
          musicIcon.className = isPlaying ? 'fa fa-pause music-icon' : 'fa fa-music music-icon';
        }
        
      } catch (error) {
        console.error('更新播放状态错误:', error);
        if (musicControl) {
          musicControl.classList.remove('playing');
        }
        if (playPauseBtn) {
          playPauseBtn.innerHTML = '<i class="fa fa-play"></i>';
        }
        if (musicIcon) {
          musicIcon.className = 'fa fa-music music-icon';
        }
      }
    }
    
    // 更新音乐信息
    function updateMusicInfo() {
      try {
        const playerType = getCurrentPlayerType();
        
        if (playerType === 'local') {
          const localPlayer = window.localMusicPlayer || window.musicPlayer;
          if (localPlayer) {
            // 尝试多种方式获取当前歌曲信息
            let currentSong = null;
            
            // 方法1: 直接从currentSong属性获取
            if (localPlayer.currentSong) {
              currentSong = localPlayer.currentSong;
            }
            // 方法2: 通过getCurrentSong方法获取
            else if (typeof localPlayer.getCurrentSong === 'function') {
              currentSong = localPlayer.getCurrentSong();
            }
            // 方法3: 从playlist和currentIndex获取
            else if (localPlayer.playlist && localPlayer.playlist.length > 0 && 
                     typeof localPlayer.currentIndex === 'number' && 
                     localPlayer.currentIndex >= 0 && 
                     localPlayer.currentIndex < localPlayer.playlist.length) {
              currentSong = localPlayer.playlist[localPlayer.currentIndex];
            }
            
            if (currentSong) {
              const title = currentSong.title || currentSong.name || '未知歌曲';
              const artist = currentSong.artist || currentSong.author || '未知艺术家';
              const coverSrc = currentSong.cover || './images/default-cover.svg';
              
              if (musicTitle) {
                musicTitle.textContent = title;
              }
              if (musicArtist) {
                musicArtist.textContent = artist;
              }
              if (currentSongCover) {
                currentSongCover.src = coverSrc;
                currentSongCover.onerror = function() {
                  this.src = './images/default-cover.svg';
                };
              }
              
              console.log('本地音乐信息更新成功:', {
                title: title,
                artist: artist,
                index: localPlayer.currentIndex,
                isPlaying: localPlayer.isPlaying
              });
            } else {
              if (musicTitle) {
                musicTitle.textContent = '暂无音乐';
              }
              if (musicArtist) {
                musicArtist.textContent = '点击播放音乐';
              }
              console.log('本地音乐信息获取失败: 无法获取当前歌曲信息');
            }
          } else {
            if (musicTitle) {
              musicTitle.textContent = '暂无音乐';
            }
            if (musicArtist) {
              musicArtist.textContent = '播放器未初始化';
            }
            console.log('本地音乐播放器实例不存在');
          }
        } else if (playerType === 'aplayer') {
          if (!window.ap) {
            if (musicTitle) {
              musicTitle.textContent = '暂无播放';
            }
            if (musicArtist) {
              musicArtist.textContent = '点击播放音乐';
            }
            return;
          }
          
          let currentMusic = null;
          let currentIndex = 0;
          
          // 获取当前播放索引
          if (window.ap.list && typeof window.ap.list.index !== 'undefined') {
            currentIndex = window.ap.list.index;
          }
          
          // 尝试多种方式获取当前音乐信息
          if (window.ap.list && window.ap.list.audios && window.ap.list.audios[currentIndex]) {
            currentMusic = window.ap.list.audios[currentIndex];
          } else if (window.ap.options && window.ap.options.audio) {
            // 单首歌曲模式
            if (Array.isArray(window.ap.options.audio)) {
              currentMusic = window.ap.options.audio[currentIndex] || window.ap.options.audio[0];
            } else {
              currentMusic = window.ap.options.audio;
            }
          } else if (window.ap.audio) {
            // 从audio元素获取信息
            const audioEl = window.ap.audio;
            currentMusic = {
              name: audioEl.title || audioEl.getAttribute('data-title') || '未知歌曲',
              artist: audioEl.getAttribute('data-artist') || audioEl.getAttribute('data-author') || '未知艺术家'
            };
          }
          
          // 更新显示信息
          if (currentMusic) {
            const title = currentMusic.name || currentMusic.title || '未知歌曲';
            const artist = currentMusic.artist || currentMusic.author || '未知艺术家';
            const coverSrc = currentMusic.cover || currentMusic.pic || '/images/default-cover.svg';
            
            if (musicTitle) {
              musicTitle.textContent = title;
            }
            if (musicArtist) {
              musicArtist.textContent = artist;
            }
            if (currentSongCover) {
              currentSongCover.src = coverSrc;
              currentSongCover.onerror = function() {
                this.src = '/images/default-cover.svg';
              };
            }
            
            console.log('Music info updated:', { title, artist });
          } else {
            if (musicTitle) {
              musicTitle.textContent = '音乐播放器';
            }
            if (musicArtist) {
              musicArtist.textContent = '准备就绪';
            }
            console.log('No music info available');
          }
        } else {
          if (musicTitle) {
            musicTitle.textContent = '暂无音乐';
          }
          if (musicArtist) {
            musicArtist.textContent = '未知艺术家';
          }
          console.log('未检测到音乐播放器');
        }
      } catch (error) {
        console.error('更新音乐信息错误:', error);
        if (musicTitle) {
          musicTitle.textContent = '暂无音乐';
        }
        if (musicArtist) {
          musicArtist.textContent = '未知艺术家';
        }
      }
    }
    
    // 更新进度条
    function updateProgress() {
      try {
        const playerType = getCurrentPlayerType();
        let currentTime = 0;
        let duration = 0;
        
        if (playerType === 'local') {
          const localPlayer = window.localMusicPlayer || window.musicPlayer;
          if (localPlayer && localPlayer.audio) {
            currentTime = localPlayer.audio.currentTime || 0;
            duration = localPlayer.audio.duration || 0;
            console.log('本地播放器进度更新:', {
              currentTime: formatTime(currentTime),
              duration: formatTime(duration),
              progress: duration > 0 ? ((currentTime / duration) * 100).toFixed(1) + '%' : '0%'
            });
          }
        } else if (playerType === 'aplayer') {
          if (window.ap && window.ap.audio) {
            const audio = window.ap.audio;
            currentTime = audio.currentTime || 0;
            duration = audio.duration || 0;
            console.log('APlayer进度更新:', {
              currentTime: formatTime(currentTime),
              duration: formatTime(duration),
              progress: duration > 0 ? ((currentTime / duration) * 100).toFixed(1) + '%' : '0%'
            });
          }
        }
        
        if (duration > 0 && !isNaN(duration) && isFinite(duration)) {
          const progress = Math.min((currentTime / duration) * 100, 100);
          if (progressFill) {
            progressFill.style.width = progress + '%';
          }
          
          if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(currentTime);
          }
          if (totalTimeEl) {
            totalTimeEl.textContent = formatTime(duration);
          }
        } else {
          if (progressFill) {
            progressFill.style.width = '0%';
          }
          if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(currentTime);
          }
          if (totalTimeEl) {
            totalTimeEl.textContent = '--:--';
          }
        }
      } catch (error) {
        console.error('Error updating progress:', error);
        if (progressFill) {
          progressFill.style.width = '0%';
        }
        if (currentTimeEl) {
          currentTimeEl.textContent = '00:00';
        }
        if (totalTimeEl) {
          totalTimeEl.textContent = '00:00';
        }
      }
    }
    
    // 更新音量显示（带防抖）
    function updateVolume() {
      if (isVolumeUpdating) {
        return; // 防止循环更新
      }
      
      const playerType = getCurrentPlayerType();
      let volume = 0;
      
      if (playerType === 'local') {
        const localPlayer = window.localMusicPlayer || window.musicPlayer;
        if (localPlayer && localPlayer.audio) {
          volume = localPlayer.audio.volume;
        }
      } else if (playerType === 'aplayer') {
        if (window.ap && window.ap.audio) {
          volume = window.ap.audio.volume;
        }
      }
      
      // 使用防抖更新UI
      clearTimeout(volumeUpdateTimeout);
      volumeUpdateTimeout = setTimeout(() => {
        updateVolumeUIImmediate(volume);
        if (volumeSlider) {
          volumeSlider.value = Math.round(volume * 100);
        }
      }, 100);
    }
    
    // 事件监听 - musicControl已被删除，注释掉相关事件监听
    // musicControl.addEventListener('click', togglePanel);
    
    // 播放/暂停
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        try {
          const playerType = getCurrentPlayerType();
          
          if (playerType === 'local') {
            const localPlayer = window.localMusicPlayer || window.musicPlayer;
            if (localPlayer) {
              if (localPlayer.isPlaying) {
                localPlayer.pause();
              } else {
                localPlayer.play();
              }
            }
          } else if (playerType === 'aplayer') {
            if (window.ap && window.ap.audio) {
              if (window.ap.audio.paused) {
                window.ap.play();
              } else {
                window.ap.pause();
              }
            }
          }
        } catch (error) {
          console.error('播放/暂停控制错误:', error);
        }
      });
    }

    // 上一首
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        try {
          const playerType = getCurrentPlayerType();
          
          if (playerType === 'local') {
            const localPlayer = window.localMusicPlayer || window.musicPlayer;
            if (localPlayer) {
              localPlayer.previousTrack();
            }
          } else if (playerType === 'aplayer') {
            if (window.ap) {
              window.ap.skipBack();
            }
          }
        } catch (error) {
          console.error('上一首控制错误:', error);
        }
      });
    }

    // 下一首
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        try {
          const playerType = getCurrentPlayerType();
          
          if (playerType === 'local') {
            const localPlayer = window.localMusicPlayer || window.musicPlayer;
            if (localPlayer) {
              localPlayer.nextTrack();
            }
          } else if (playerType === 'aplayer') {
            if (window.ap) {
              window.ap.skipForward();
            }
          }
        } catch (error) {
          console.error('下一首控制错误:', error);
        }
      });
    }

    // 进度条点击
    if (progressBar) {
      progressBar.addEventListener('click', (e) => {
        try {
          const playerType = getCurrentPlayerType();
          const rect = progressBar.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const width = rect.width;
          const percentage = clickX / width;
          
          if (playerType === 'local') {
            const localPlayer = window.localMusicPlayer || window.musicPlayer;
            if (localPlayer && localPlayer.audio) {
              const duration = localPlayer.audio.duration;
              if (duration && !isNaN(duration) && isFinite(duration)) {
                const newTime = duration * percentage;
                localPlayer.audio.currentTime = newTime;
                updateProgress();
              }
            }
          } else if (playerType === 'aplayer') {
            if (window.ap && window.ap.audio) {
              const duration = window.ap.audio.duration;
              if (duration && !isNaN(duration) && isFinite(duration)) {
                const newTime = duration * percentage;
                window.ap.audio.currentTime = newTime;
                updateProgress();
              }
            }
          }
        } catch (error) {
          console.error('进度条控制错误:', error);
        }
      });
    }
    }

    // 音量滑块点击
    if (volumeSlider) {
      volumeSlider.addEventListener('click', (e) => {
        const playerType = getCurrentPlayerType();
        
        const rect = volumeSlider.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = Math.max(0, Math.min(1, clickX / width));
        
        // 设置标志位，防止循环更新
        isVolumeUpdating = true;
        
        if (playerType === 'local') {
          const localPlayer = window.localMusicPlayer || window.musicPlayer;
          if (localPlayer && localPlayer.audio) {
            localPlayer.audio.volume = percentage;
            // 直接更新UI，不触发updateVolume
            const volumePercent = Math.round(percentage * 100);
            if (volumeFill) {
              volumeFill.style.width = volumePercent + '%';
            }
            if (volumeValue) {
              volumeValue.textContent = volumePercent;
            }
            
            // 更新音量图标
            if (volumeIcon) {
              if (volumePercent === 0) {
                volumeIcon.className = 'fa fa-volume-off volume-icon';
              } else if (volumePercent < 50) {
                volumeIcon.className = 'fa fa-volume-down volume-icon';
              } else {
                volumeIcon.className = 'fa fa-volume-up volume-icon';
              }
            }
          }
        } else if (playerType === 'aplayer') {
          if (window.ap) {
            window.ap.volume(percentage);
            // 直接更新UI，不触发updateVolume
            const volumePercent = Math.round(percentage * 100);
            if (volumeFill) {
              volumeFill.style.width = volumePercent + '%';
            }
            if (volumeValue) {
              volumeValue.textContent = volumePercent;
            }
            
            // 更新音量图标
            if (volumeIcon) {
              if (volumePercent === 0) {
                volumeIcon.className = 'fa fa-volume-off volume-icon';
              } else if (volumePercent < 50) {
                volumeIcon.className = 'fa fa-volume-down volume-icon';
              } else {
                volumeIcon.className = 'fa fa-volume-up volume-icon';
              }
            }
          }
        }
        
        // 延迟重置标志位
        setTimeout(() => {
          isVolumeUpdating = false;
        }, 100);
      });
    }

    // 立即更新音量UI（无过渡效果）
    function updateVolumeUIImmediate(volume) {
      const volumePercent = Math.round(volume * 100);
      
      if (volumeFill) {
        // 临时禁用过渡效果
        volumeFill.style.transition = 'none';
        volumeFill.style.width = volumePercent + '%';
        // 强制重绘后恢复过渡效果
        volumeFill.offsetHeight;
        volumeFill.style.transition = 'width 0.1s ease';
      }
      if (volumeValue) {
        volumeValue.textContent = volumePercent;
      }
      
      // 更新音量图标
      if (volumeIcon) {
        if (volumePercent === 0) {
          volumeIcon.className = 'fa fa-volume-off volume-icon';
        } else if (volumePercent < 50) {
          volumeIcon.className = 'fa fa-volume-down volume-icon';
        } else {
          volumeIcon.className = 'fa fa-volume-up volume-icon';
        }
      }
    }
    
    // 音量滑块事件
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        try {
          const volume = e.target.value / 100;
          const playerType = getCurrentPlayerType();
          
          // 设置标志位，防止循环更新
          isVolumeUpdating = true;
          
          if (playerType === 'local') {
            const localPlayer = window.localMusicPlayer || window.musicPlayer;
            if (localPlayer && localPlayer.audio) {
              localPlayer.audio.volume = volume;
              // 立即更新UI，避免延迟导致的弹跳
              updateVolumeUIImmediate(volume);
            }
          } else if (playerType === 'aplayer') {
            if (window.ap && window.ap.audio) {
              window.ap.audio.volume = volume;
              // 立即更新UI，避免延迟导致的弹跳
              updateVolumeUIImmediate(volume);
            }
          }
          
          // 延迟重置标志位
          setTimeout(() => {
            isVolumeUpdating = false;
          }, 150);
        } catch (error) {
          console.error('音量控制错误:', error);
          // 重置标志位
          isVolumeUpdating = false;
        }
      });
    }

    // 点击面板外部关闭
    document.addEventListener('click', (e) => {
      // musicControl已被删除，只检查musicPanel
      if (musicPanel && !musicPanel.contains(e.target)) {
        if (isExpanded) {
          togglePanel();
        }
      }
    });
    
    // APlayer事件监听
    function bindAPlayerEvents() {
      if (!window.ap) {
        console.log('No APlayer instance found for event binding');
        return;
      }
      
      console.log('Binding events to APlayer instance:', window.ap);
      
      // 播放事件
      window.ap.on('play', () => {
        updatePlayState();
        updateMusicInfo();
        console.log('Music started playing');
      });
      
      // 暂停事件
      window.ap.on('pause', () => {
        updatePlayState();
        console.log('Music paused');
      });
      
      // 时间更新事件
      window.ap.on('timeupdate', updateProgress);
      
      // 元数据加载完成
      window.ap.on('loadedmetadata', () => {
        updateMusicInfo();
        updateProgress();
        console.log('Music metadata loaded');
      });
      
      // 播放结束
      window.ap.on('ended', () => {
        updatePlayState();
        console.log('Music ended');
      });
      
      // 音量变化
      window.ap.on('volumechange', updateVolume);
      
      // 切换歌曲时更新信息
      window.ap.on('listswitch', (index) => {
        setTimeout(() => {
          updateMusicInfo();
          updatePlayState();
          updateProgress();
        }, 100);
        console.log('Music switched to index:', index);
      });
      
      // MetingJS特有事件监听
      if (window.ap.on) {
        // 监听歌曲加载事件
        try {
          window.ap.on('loadstart', () => {
            console.log('Song loading started');
            updateMusicInfo();
          });
          
          window.ap.on('canplay', () => {
            console.log('Song can play');
            updateMusicInfo();
            updateProgress();
          });
          
          window.ap.on('error', (error) => {
            console.error('APlayer error:', error);
            if (musicTitle) {
              musicTitle.textContent = '播放错误';
            }
            if (musicArtist) {
              musicArtist.textContent = '请检查网络连接';
            }
          });
        } catch (e) {
          console.log('Some events not supported:', e.message);
        }
      }
      
      // 监听原生audio事件作为备用
      if (window.ap.audio) {
        window.ap.audio.addEventListener('loadstart', () => {
          console.log('Audio loadstart event');
          updateMusicInfo();
        });
        
        window.ap.audio.addEventListener('canplay', () => {
          console.log('Audio canplay event');
          updateMusicInfo();
        });
        
        window.ap.audio.addEventListener('durationchange', () => {
          console.log('Audio duration changed');
          updateProgress();
        });
        
        window.ap.audio.addEventListener('timeupdate', () => {
          updateProgress();
        });
        
        window.ap.audio.addEventListener('play', () => {
          console.log('Native audio play event');
          updatePlayState();
          updateMusicInfo();
        });
        
        window.ap.audio.addEventListener('pause', () => {
          console.log('Native audio pause event');
          updatePlayState();
        });
      }
      
      // 初始化状态
      setTimeout(() => {
        updateMusicInfo();
        updatePlayState();
        updateVolume();
        updateProgress();
        console.log('Initial state updated');
      }, 300);
      
      console.log('APlayer events bound successfully');
    }
    
    // 等待APlayer初始化完成后绑定事件
    waitForAPlayer(bindAPlayerEvents);
    
    // 本地音乐播放器事件监听
    function bindLocalPlayerEvents() {
      const localPlayer = window.localMusicPlayer || window.musicPlayer;
      if (!localPlayer) return;
      
      // 监听播放状态变化
      if (localPlayer.audio) {
        localPlayer.audio.addEventListener('play', () => {
          updatePlayState();
          updateMusicInfo();
        });
        
        localPlayer.audio.addEventListener('pause', () => {
          updatePlayState();
        });
        
        localPlayer.audio.addEventListener('timeupdate', () => {
          updateProgress();
        });
        
        localPlayer.audio.addEventListener('volumechange', () => {
          if (!isVolumeUpdating) {
            updateVolume(true); // 跳过防抖，直接更新
          }
        });
        
        localPlayer.audio.addEventListener('loadedmetadata', () => {
          updateMusicInfo();
          updateProgress();
        });
        
        localPlayer.audio.addEventListener('ended', () => {
          updatePlayState();
        });
      }
      
      // 监听歌曲切换
      if (typeof localPlayer.on === 'function') {
        localPlayer.on('songchange', () => {
          updateMusicInfo();
          updatePlayState();
          updateProgress();
        });
      }
    }
    
    // 检测并绑定播放器事件
    function detectAndBindPlayer() {
      const playerType = getCurrentPlayerType();
      
      if (playerType === 'local') {
        bindLocalPlayerEvents();
      }
      
      // 更新所有状态
      updatePlayState();
      updateMusicInfo();
      updateProgress();
      updateVolume();
    }
    
    // 监听本地音乐播放器的自定义事件
    document.addEventListener('localMusicUpdate', (event) => {
      try {
        const detail = event.detail;
        console.log('收到本地音乐更新事件:', detail);
        
        // 更新音乐信息
        if (detail.currentSong) {
          const title = detail.currentSong.title || detail.currentSong.name || '未知歌曲';
          const artist = detail.currentSong.artist || detail.currentSong.author || '未知艺术家';
          
          if (musicTitle) {
            musicTitle.textContent = title;
          }
          if (musicArtist) {
            musicArtist.textContent = artist;
          }
        }
        
        // 更新播放状态
        const isPlaying = detail.isPlaying || false;
        // musicControl已被删除，跳过相关操作
        // if (musicControl) {
        //   musicControl.classList.toggle('playing', isPlaying);
        // }
        if (playPauseBtn) {
          playPauseBtn.innerHTML = isPlaying ? '<i class="fa fa-pause"></i>' : '<i class="fa fa-play"></i>';
        }
        if (musicIcon) {
          musicIcon.className = isPlaying ? 'fa fa-pause music-icon' : 'fa fa-music music-icon';
        }
        
        // 更新进度
        if (detail.progress !== undefined && !isNaN(detail.progress) && progressFill) {
          progressFill.style.width = Math.min(detail.progress, 100) + '%';
        }
        
        // 更新时间显示
        if (detail.currentTime !== undefined && detail.duration !== undefined) {
          if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(detail.currentTime);
          }
          if (totalTimeEl) {
            totalTimeEl.textContent = formatTime(detail.duration);
          }
        }
        
        // 更新音量（避免在用户操作时更新）
        if (detail.volume !== undefined && !isVolumeUpdating) {
          const volumePercent = Math.round(detail.volume * 100);
          if (volumeFill) {
            volumeFill.style.width = volumePercent + '%';
          }
          if (volumeValue) {
            volumeValue.textContent = volumePercent;
          }
          
          // 更新音量图标
          if (volumeIcon) {
            if (volumePercent === 0) {
              volumeIcon.className = 'fa fa-volume-off volume-icon';
            } else if (volumePercent < 50) {
              volumeIcon.className = 'fa fa-volume-down volume-icon';
            } else {
              volumeIcon.className = 'fa fa-volume-up volume-icon';
            }
          }
        }
        
      } catch (error) {
        console.error('处理本地音乐更新事件错误:', error);
      }
    });
    
    // 定期检测播放器并更新状态
    setInterval(() => {
      detectAndBindPlayer();
    }, 2000); // 降低检测频率，避免与事件监听冲突
    
    // 初始检测
    detectAndBindPlayer();
    
    // 初始更新信息
    setTimeout(() => {
      updateMusicInfo();
      updatePlayState();
      updateProgress();
      updateVolume();
    }, 500);
    
    // 定期检查APlayer状态（防止某些事件未触发）
    setInterval(() => {
      if (window.ap && !window.ap.audio.paused) {
        updateProgress();
      }
    }, 1000);

  // 检查是否存在APlayer相关元素
  function checkAPlayerExists() {
    const aplayerElements = document.querySelectorAll('.aplayer, [id*="aplayer"], [class*="aplayer"], meting-js');
    const metingElements = document.querySelectorAll('meting-js');
    return aplayerElements.length > 0 || metingElements.length > 0;
  }

  // 动态检测APlayer实例
  function detectAPlayerInstance() {
    // 检查常见的全局变量
    const possibleInstances = [
      window.ap,
      window.aplayer,
      window.metingjs?.aplayer
    ];
    
    for (let instance of possibleInstances) {
      if (instance && typeof instance.on === 'function') {
        return instance;
      }
    }
    
    // 检查DOM元素上的实例
    const aplayerElements = document.querySelectorAll('.aplayer');
    for (let element of aplayerElements) {
      if (element.aplayer || element._aplayer || element.aplayerInstance) {
        return element.aplayer || element._aplayer || element.aplayerInstance;
      }
    }
    
    // 检查编号的实例
    for (let i = 0; i < 10; i++) {
      if (window['ap' + i] && typeof window['ap' + i].on === 'function') {
        return window['ap' + i];
      }
    }
    
    return null;
  }

  // 延迟初始化函数
  function delayedInit() {
    if (checkAPlayerExists() || typeof APlayer !== 'undefined') {
      console.log('Initializing music control...');
      initMusicControl();
    } else {
      console.log('APlayer not found, will retry...');
      setTimeout(delayedInit, 1000);
    }
  }

  // 定期检查新的APlayer实例
  function startInstanceMonitoring() {
    setInterval(() => {
      if (!window.ap) {
        const newInstance = detectAPlayerInstance();
        if (newInstance) {
          console.log('New APlayer instance detected:', newInstance);
          window.ap = newInstance;
          // 重新绑定事件
          waitForAPlayer(() => {
            const { musicControl, musicPanel } = createMusicControl();
            if (musicControl && musicPanel) {
              console.log('Re-initializing with new instance');
            }
          });
        }
      }
    }, 2000);
  }

  // 启动实例监控
  startInstanceMonitoring();
  
  // 初始化
  if (checkAPlayerExists()) {
    console.log('APlayer elements found, initializing immediately');
    setTimeout(initMusicControl, 500);
  } else {
    console.log('APlayer elements not found, setting up observer');
    
    // 如果页面加载时没有APlayer，监听DOM变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              if (node.classList && (node.classList.contains('aplayer') || node.tagName === 'METING-JS') ||
                  (node.querySelector && (node.querySelector('.aplayer') || node.querySelector('meting-js')))) {
                console.log('APlayer element detected, initializing...');
                observer.disconnect();
                setTimeout(initMusicControl, 800);
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // 备用延迟初始化
    setTimeout(delayedInit, 2000);
  }
  
  // 额外的MetingJS支持
  // 监听MetingJS可能触发的自定义事件
  document.addEventListener('aplayer-initialized', (event) => {
    console.log('APlayer initialized event detected:', event.detail);
    if (event.detail && event.detail.aplayer) {
      window.ap = event.detail.aplayer;
      setTimeout(initMusicControl, 300);
    }
  });
  
  // 监听可能的MetingJS加载完成事件
  window.addEventListener('load', () => {
    setTimeout(() => {
      const instance = detectAPlayerInstance();
      if (instance && !window.ap) {
        console.log('APlayer instance found after page load:', instance);
        window.ap = instance;
        setTimeout(initMusicControl, 500);
      }
    }, 1000);
  });
});