<script setup lang="ts">
import { ref, reactive, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import type { FormRules } from 'element-plus'
import type { UpdatePwdPayload } from '@/api/system/sysUser'
import * as sysUserApi from '@/api/system/sysUser'
import { useUserStore } from '@/stores/modules/user'
import { usePermissionStore } from '@/stores/modules/permission'
import { encryptPwdRsa } from '@/utils/encrypt'
import { message } from '@/utils/feedback'

const router = useRouter()
const userStore = useUserStore()
const permissionStore = usePermissionStore()

const visible = ref(false)
const formRef = useTemplateRef('formRef')

const INITIAL_FORM = {
  oldPwd: '',
  newPwd1: '',
  newPwd2: '',
}

const formModel = reactive({ ...INITIAL_FORM })

const rules: FormRules = {
  oldPwd: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPwd1: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      pattern: /^(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,}$/,
      message: '至少6位，且至少包含1个特殊字符（! @ # $ % ^ & *）',
      trigger: 'blur',
    },
  ],
  newPwd2: [
    {
      required: true,
      validator: (_rule, value, callback) => {
        if (!value) {
          callback(new Error('请再次输入新密码'))
        } else if (value !== formModel.newPwd1) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

const saveMutation = useMutation({
  mutationFn: (payload: UpdatePwdPayload) => sysUserApi.updateUserPwd(payload),
  onSuccess: () => {
    message.success('密码修改成功，请重新登录')
    userStore.resetToken()
    permissionStore.resetRoutes()
    router.push('/login')
  },
})

function resetForm() {
  Object.assign(formModel, INITIAL_FORM)
  formRef.value?.clearValidate()
}

function open() {
  resetForm()
  visible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saveMutation.mutate({
    oldPwd: encryptPwdRsa(formModel.oldPwd),
    newPwd1: encryptPwdRsa(formModel.newPwd1),
    newPwd2: encryptPwdRsa(formModel.newPwd2),
  })
}

defineExpose({ open })
</script>

<template>
  <el-dialog
    v-model="visible"
    title="修改密码"
    width="420px"
    align-center
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-width="100px"
      :validate-on-rule-change="false"
      :disabled="saveMutation.isPending.value"
    >
      <el-form-item label="旧密码" prop="oldPwd">
        <el-input v-model="formModel.oldPwd" placeholder="请输入旧密码" autocomplete="off" />
      </el-form-item>
      <el-form-item label="新密码" prop="newPwd1">
        <el-input
          v-model="formModel.newPwd1"
          type="password"
          show-password
          placeholder="请输入新密码"
          autocomplete="new-password"
        />
      </el-form-item>
      <el-form-item label="确认新密码" prop="newPwd2">
        <el-input
          v-model="formModel.newPwd2"
          type="password"
          show-password
          placeholder="请再次输入新密码"
          autocomplete="new-password"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saveMutation.isPending.value" @click="handleSubmit">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>
