---
title: MDP Homomorphic Networks：强化学习中的群对称性（Group Symmetries）
createTime: 2025/08/17 15:42:22
permalink: /article/tml6nabz/
---


更详细的内容可以看[MDP Homomorphic Networks](https://zhuanlan.zhihu.com/p/655937679) 这篇讲解, 这里更多的讲讲代码的实现.
<!-- more -->
## 基础概念

### 不变性(Invariance)

不变 (Invariance) 与对称 (Symmetries)：等价类中的点通常存在一定的关系，这可以用一个变换操作 $L_g : \mathcal{X} \to \mathcal{X}$，其中 $g \in G$，$G$ 表示群。如果 $L_g$ 满足

$$f(x) = f(L_g[x]), \quad \text{for all } g \in G, x \in \mathcal{X}$$

简单来说就是, 经过变化后, 输出将保持不变, 在具体的实现里, 也就是说 **价值函数** 因该是一个不变的

### 等变性(Equivariance)

等变 (Equivariance)：与不变相关的另一个概念是等变。给定一个变换操作 $L_g : \mathcal{X} \to \mathcal{X}$，和一个映射 $f : \mathcal{X} \to \mathcal{Y}$，如果存在 $f$ 输出空间上的另一个变换操作 $K_g : \mathcal{Y} \to \mathcal{Y}$，使得

$K_g[f(x)] = f(L_g[x]), \quad \text{for all } g \in G, x \in \mathcal{X}$

### 代码

```python
class GroupRepresentations:
    """
    Class to hold representations
    """
    def __init__(self, trans_set, name):
        """
        """
        self.representations = trans_set
        self.name = name

    def __len__(self):
        """
        """
        return len(self.representations)

    def __getitem__(self, idx):
        """
        """
        return self.representations[idx]

```

```python
import numpy as np
import torch

from .ops import GroupRepresentations


def get_cartpole_state_group_representations():
    """
    Representation of the group symmetry on the state: a multiplication of all
    state variables by -1
    """
    representations = [torch.FloatTensor(np.eye(4)),
                       torch.FloatTensor(-1*np.eye(4))]
    return GroupRepresentations(representations, "CartPoleStateGroupRepr")

```

cartpole 的状态空间为
`Box(\[-4.8 -inf -0.41887903 -inf], [4.8 inf 0.41887903 inf], (4,), float32`
其中包含了四个变量, 分别是

1. 小车位置(-4.8 到 4.8)
2. 小车速度(-inf 到 inf)
3. 杆子角度(-0.41887903 到 0.41887903)
4. 杆子角速度(-inf 到 inf)
做的变换为 x = -x

```python
def get_cartpole_action_group_representations():
    """
    Representation of the group symmetry on the policy: a permutation of the
    actions
    """
    representations = [torch.FloatTensor(np.eye(2)),
                       torch.FloatTensor(np.array([[0, 1], [1, 0]]))]
    return GroupRepresentations(representations, "CartPoleActionGroupRepr")
```

cartpole 的动作空间为
`Discrete(2)`, 其中包含了两个动作, 分别是
0.向左移动小车
1.向右移动小车
做的变换为交换两个动作, 即 0 和 1 互换

```python

def get_cartpole_invariants():
    """
    Function to enable easy construction of invariant layers (for value
    networks)
    """
    representations = [torch.FloatTensor(np.eye(1)),
                       torch.FloatTensor(np.eye(1))]
    return GroupRepresentations(representations, "CartPoleInvariantGroupRepr")
```
